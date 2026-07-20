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
  error?: string;
}

@Injectable()
export class SocialAdapter {
  private readonly logger = new Logger(SocialAdapter.name);

  private get live(): boolean {
    return (
      (process.env.INTEGRATIONS_MODE ?? "simulated") === "live" &&
      !!process.env.META_GRAPH_TOKEN
    );
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

  private async publishInstagram(
    input: SocialPublishInput,
  ): Promise<SocialPublishResult> {
    const token = process.env.META_GRAPH_TOKEN!;
    const igUserId = process.env.IG_BUSINESS_ACCOUNT_ID;
    const image = input.mediaUrls[0];
    if (!igUserId || !image) return this.simulate(input);

    const container = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: image,
          caption: input.caption,
          access_token: token,
        }),
      },
    );
    if (!container.ok)
      throw new Error(
        `IG container HTTP ${container.status}: ${await container.text()}`,
      );
    const { id: creationId } = (await container.json()) as { id: string };

    const publish = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: creationId, access_token: token }),
      },
    );
    if (!publish.ok)
      throw new Error(
        `IG publish HTTP ${publish.status}: ${await publish.text()}`,
      );
    const { id } = (await publish.json()) as { id: string };
    return { ok: true, externalId: id };
  }

  private async publishFacebook(
    input: SocialPublishInput,
  ): Promise<SocialPublishResult> {
    const token = process.env.META_GRAPH_TOKEN!;
    const pageId = process.env.FB_PAGE_ID;
    if (!pageId) return this.simulate(input);
    const image = input.mediaUrls[0];
    const endpoint = image
      ? `https://graph.facebook.com/v19.0/${pageId}/photos`
      : `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const payload = image
      ? { url: image, caption: input.caption, access_token: token }
      : { message: input.caption, access_token: token };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(`FB publish HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { id?: string; post_id?: string };
    return {
      ok: true,
      externalId: json.post_id ?? json.id ?? `fb_${Date.now()}`,
    };
  }
}
