import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { QueueName, SocialChannel, SocialPostStatus } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";
import { SocialAdapter } from "../integrations/social.adapter";
import { buildListingCaption } from "./domain/caption";
import { urlKey } from "./domain/social-links";

type SocialJob =
  | { companyId: string; propertyId: string }
  | { companyId: string; propertyId: string; originalPostId: string };

@Injectable()
export class SocialWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialWorker.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;

  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
    private readonly social: SocialAdapter,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<SocialJob>(QueueName.SOCIAL, async (job) => {
      // Automatic reposts were removed; drain any jobs still queued.
      if (job.name === "price-repost") return;
      await this.autopost(
        job.data.companyId,
        job.data.propertyId,
        job.name === "share-now",
      );
    });
    this.timer = setInterval(() => {
      this.publishDuePosts().catch((err) =>
        this.logger.warn(
          `Scheduled publish skipped: ${(err as Error).message}`,
        ),
      );
    }, 60_000);
    this.logger.log("Social worker registered (autopost + scheduler)");
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Posts a listing once when it is published. Later posts only happen through
   * the manual "share now" action (`force`), which always creates a fresh one.
   */
  private async autopost(
    companyId: string,
    propertyId: string,
    force = false,
  ): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, companyId },
      include: {
        media: {
          where: { type: "PHOTO" },
          take: 10,
          orderBy: [{ isCover: "desc" }, { position: "asc" }],
        },
      },
    });
    if (!property) return;

    const channels: SocialChannel[] = [];
    if (property.shareOnInstagram) channels.push(SocialChannel.INSTAGRAM);
    if (property.shareOnFacebook) channels.push(SocialChannel.FACEBOOK);
    if (channels.length === 0) {
      this.logger.debug(
        `Skipping social post for ${property.reference}: no channel enabled`,
      );
      return;
    }

    const existingMain = force
      ? null
      : await this.prisma.socialPost.findFirst({
          where: {
            companyId,
            propertyId,
            repostOfId: null,
            repostStrategy: null,
            deletedAt: null,
            status: {
              in: [SocialPostStatus.SCHEDULED, SocialPostStatus.PUBLISHED],
            },
          },
          orderBy: { createdAt: "desc" },
        });
    if (existingMain) return;

    await this.prisma.socialPost.create({
      data: {
        companyId,
        propertyId,
        channels,
        caption: buildListingCaption(property),
        mediaUrls: property.media.map((m) => m.url),
        status: SocialPostStatus.SCHEDULED,
        scheduleAt: new Date(),
      },
    });
  }

  async publishDuePosts(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;
    try {
      const due = await this.prisma.socialPost.findMany({
        where: {
          status: SocialPostStatus.SCHEDULED,
          scheduleAt: { lte: new Date() },
          deletedAt: null,
        },
        take: 25,
      });

      for (const post of due) {
        const claimed = await this.prisma.socialPost.updateMany({
          where: { id: post.id, status: SocialPostStatus.SCHEDULED },
          data: { status: SocialPostStatus.FAILED },
        });
        if (claimed.count === 0) continue;

        let ok = true;
        const externalRefs: Record<string, string> = {};
        const errors: string[] = [];
        for (const channel of post.channels as SocialChannel[]) {
          const res = await this.social.publish({
            channel,
            caption: post.caption,
            mediaUrls: post.mediaUrls,
          });
          if (res.ok && res.externalId) {
            externalRefs[channel] = res.externalId;
            if (res.permalink) externalRefs[urlKey(channel)] = res.permalink;
          } else {
            ok = false;
            errors.push(`${channel}: ${res.error ?? "unknown error"}`);
          }
        }

        if (!ok)
          this.logger.warn(
            `Social post ${post.id} failed — ${errors.join("; ")}`,
          );

        await this.prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: ok ? SocialPostStatus.PUBLISHED : SocialPostStatus.FAILED,
            publishedAt: ok ? new Date() : null,
            externalRefs,
          },
        });
      }
    } finally {
      this.publishing = false;
    }
  }
}
