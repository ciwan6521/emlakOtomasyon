import { Injectable, Logger } from "@nestjs/common";
import { SocialChannel } from "@reos/shared";

export interface SocialPublishInput {
  channel: SocialChannel;
  caption: string;
  mediaUrls: string[];
}

export interface SocialPublishResult {
  ok: boolean;
  externalId?: string;
  /** Public URL of the published post, when the platform returns one. */
  permalink?: string;
  error?: string;
}

export interface SocialChannelStatus {
  channel: SocialChannel;
  configured: boolean;
  live: boolean;
  missing: string[];
  /** Account handle / page name resolved from the Graph API (live only). */
  account?: string;
  error?: string;
}

const GRAPH = "https://graph.facebook.com/v19.0";
/** Instagram caption hard limit is 2,200 characters. */
const IG_CAPTION_MAX = 2200;
/** A carousel must have between 2 and 10 items. */
const IG_CAROUSEL_MAX = 10;
const CONTAINER_POLL_MS = 2_000;
const CONTAINER_POLL_MAX = 30;

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number };
}

@Injectable()
export class SocialAdapter {
  private readonly logger = new Logger(SocialAdapter.name);

  private get token(): string | undefined {
    return process.env.META_GRAPH_TOKEN || undefined;
  }

  private get live(): boolean {
    return (
      (process.env.INTEGRATIONS_MODE ?? "simulated") === "live" && !!this.token
    );
  }

  /** Reports per-channel readiness for the Settings page. */
  async status(): Promise<SocialChannelStatus[]> {
    const liveMode = (process.env.INTEGRATIONS_MODE ?? "simulated") === "live";
    const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
    const fbId = process.env.FB_PAGE_ID;

    const ig: SocialChannelStatus = {
      channel: SocialChannel.INSTAGRAM,
      configured: !!this.token && !!igId,
      live: liveMode && !!this.token && !!igId,
      missing: [
        ...(this.token ? [] : ["META_GRAPH_TOKEN"]),
        ...(igId ? [] : ["IG_BUSINESS_ACCOUNT_ID"]),
      ],
    };
    const fb: SocialChannelStatus = {
      channel: SocialChannel.FACEBOOK,
      configured: !!this.token && !!fbId,
      live: liveMode && !!this.token && !!fbId,
      missing: [
        ...(this.token ? [] : ["META_GRAPH_TOKEN"]),
        ...(fbId ? [] : ["FB_PAGE_ID"]),
      ],
    };

    if (ig.live) {
      try {
        const me = await this.graphGet<{ username?: string }>(
          `${igId}?fields=username`,
        );
        ig.account = me.username ? `@${me.username}` : undefined;
      } catch (err) {
        ig.error = (err as Error).message;
      }
    }
    if (fb.live) {
      try {
        const page = await this.graphGet<{ name?: string }>(
          `${fbId}?fields=name`,
        );
        fb.account = page.name;
      } catch (err) {
        fb.error = (err as Error).message;
      }
    }
    return [ig, fb];
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    if (!this.live) return this.simulate(input);
    try {
      return input.channel === SocialChannel.INSTAGRAM
        ? await this.publishInstagram(input)
        : await this.publishFacebook(input);
    } catch (err) {
      this.logger.error(
        `Live social publish failed (${input.channel}): ${(err as Error).message}`,
      );
      return { ok: false, error: (err as Error).message };
    }
  }

  private simulate(input: SocialPublishInput): SocialPublishResult {
    this.logger.debug(
      `[sim:${input.channel}] post (${input.mediaUrls.length} media): ${input.caption.slice(0, 50)}…`,
    );
    return { ok: true, externalId: `sim_${input.channel}_${Date.now()}` };
  }

  // ─── Instagram ────────────────────────────────────────────────────────────

  private async publishInstagram(
    input: SocialPublishInput,
  ): Promise<SocialPublishResult> {
    const igUserId = process.env.IG_BUSINESS_ACCOUNT_ID;
    const images = input.mediaUrls
      .filter((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u))
      .slice(0, IG_CAROUSEL_MAX);
    if (!igUserId) throw new Error("IG_BUSINESS_ACCOUNT_ID is not set");
    if (images.length === 0)
      throw new Error("Instagram requires at least one image");

    const caption = input.caption.slice(0, IG_CAPTION_MAX);

    let creationId: string;
    if (images.length === 1) {
      creationId = await this.createContainer(igUserId, {
        image_url: images[0],
        caption,
      });
    } else {
      // Carousel: each image gets its own child container; the parent
      // container references them and carries the caption.
      const children: string[] = [];
      for (const url of images) {
        const childId = await this.createContainer(igUserId, {
          image_url: url,
          is_carousel_item: true,
        });
        await this.waitForContainer(childId);
        children.push(childId);
      }
      creationId = await this.createContainer(igUserId, {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption,
      });
    }

    await this.waitForContainer(creationId);

    const published = await this.graphPost<{ id: string }>(
      `${igUserId}/media_publish`,
      { creation_id: creationId },
    );

    let permalink: string | undefined;
    try {
      const media = await this.graphGet<{ permalink?: string }>(
        `${published.id}?fields=permalink`,
      );
      permalink = media.permalink;
    } catch (err) {
      this.logger.warn(
        `IG permalink lookup failed for ${published.id}: ${(err as Error).message}`,
      );
    }
    return { ok: true, externalId: published.id, permalink };
  }

  private async createContainer(
    igUserId: string,
    body: Record<string, string | boolean>,
  ): Promise<string> {
    const res = await this.graphPost<{ id: string }>(
      `${igUserId}/media`,
      body,
    );
    return res.id;
  }

  /**
   * Meta processes containers asynchronously; publishing before the status is
   * FINISHED fails with "Media ID is not available". Poll until ready.
   */
  private async waitForContainer(containerId: string): Promise<void> {
    for (let i = 0; i < CONTAINER_POLL_MAX; i++) {
      const res = await this.graphGet<{
        status_code?: string;
        status?: string;
      }>(`${containerId}?fields=status_code,status`);
      if (res.status_code === "FINISHED") return;
      if (res.status_code === "ERROR" || res.status_code === "EXPIRED")
        throw new Error(
          `IG container ${containerId} ${res.status_code}: ${res.status ?? "no detail"}`,
        );
      await new Promise((r) => setTimeout(r, CONTAINER_POLL_MS));
    }
    throw new Error(`IG container ${containerId} not ready after polling`);
  }

  // ─── Facebook ─────────────────────────────────────────────────────────────

  private async publishFacebook(
    input: SocialPublishInput,
  ): Promise<SocialPublishResult> {
    const pageId = process.env.FB_PAGE_ID;
    if (!pageId) throw new Error("FB_PAGE_ID is not set");
    const images = input.mediaUrls.filter(
      (u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u),
    );

    if (images.length === 0) {
      const res = await this.graphPost<{ id: string }>(`${pageId}/feed`, {
        message: input.caption,
      });
      return { ok: true, externalId: res.id, permalink: this.fbUrl(res.id) };
    }

    if (images.length === 1) {
      const res = await this.graphPost<{ id: string; post_id?: string }>(
        `${pageId}/photos`,
        { url: images[0], caption: input.caption },
      );
      const id = res.post_id ?? res.id;
      return { ok: true, externalId: id, permalink: this.fbUrl(id) };
    }

    // Multi-photo post: upload each photo unpublished, then attach them all
    // to a single feed post.
    const photoIds: string[] = [];
    for (const url of images.slice(0, IG_CAROUSEL_MAX)) {
      const res = await this.graphPost<{ id: string }>(`${pageId}/photos`, {
        url,
        published: false,
      });
      photoIds.push(res.id);
    }
    const body: Record<string, string> = { message: input.caption };
    photoIds.forEach((id, i) => {
      body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
    });
    const post = await this.graphPost<{ id: string }>(`${pageId}/feed`, body);
    return { ok: true, externalId: post.id, permalink: this.fbUrl(post.id) };
  }

  private fbUrl(postId: string): string {
    return `https://www.facebook.com/${postId}`;
  }

  // ─── Graph helpers ────────────────────────────────────────────────────────

  private async graphPost<T>(
    path: string,
    body: Record<string, string | boolean>,
  ): Promise<T> {
    const res = await fetch(`${GRAPH}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: this.token }),
    });
    return this.parse<T>(res, `POST ${path}`);
  }

  private async graphGet<T>(path: string): Promise<T> {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(
      `${GRAPH}/${path}${sep}access_token=${encodeURIComponent(this.token ?? "")}`,
    );
    return this.parse<T>(res, `GET ${path.split("?")[0]}`);
  }

  private async parse<T>(res: Response, label: string): Promise<T> {
    const json = (await res.json().catch(() => ({}))) as T & GraphError;
    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `HTTP ${res.status}`;
      const code = json.error?.code ? ` (code ${json.error.code})` : "";
      throw new Error(`Graph ${label}: ${msg}${code}`);
    }
    return json;
  }
}
