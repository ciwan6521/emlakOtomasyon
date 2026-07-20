import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  QueueName,
  RepostStrategy,
  SocialChannel,
  SocialPostStatus,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";
import { SocialAdapter } from "../integrations/social.adapter";

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
      if (job.name === "price-repost") {
        await this.schedulePriceRepost(job.data.companyId, job.data.propertyId);
        return;
      }
      await this.autopost(job.data.companyId, job.data.propertyId);
    });
    this.timer = setInterval(() => {
      this.publishDuePosts().catch((err) =>
        this.logger.warn(
          `Scheduled publish skipped: ${(err as Error).message}`,
        ),
      );
    }, 60_000);
    this.logger.log(
      "Social worker registered (autopost + repost chain + scheduler)",
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async autopost(companyId: string, propertyId: string): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, companyId },
      include: { media: { take: 4, orderBy: { position: "asc" } } },
    });
    if (!property) return;

    const existingMain = await this.prisma.socialPost.findFirst({
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
    if (existingMain) {
      await this.scheduleRepostChain(
        companyId,
        propertyId,
        existingMain.id,
        existingMain.caption,
        existingMain.mediaUrls,
        existingMain.channels as SocialChannel[],
      );
      return;
    }

    const caption = `${property.title}\n${property.rooms} · ${property.sizeM2} m² · ${property.region}\n${Number(property.price).toLocaleString("en-US")} ${property.currency}\nRef: ${property.reference}`;
    const mediaUrls = property.media.map((m) => m.url);
    const channels = [SocialChannel.INSTAGRAM, SocialChannel.FACEBOOK];

    const main = await this.prisma.socialPost.create({
      data: {
        companyId,
        propertyId,
        channels,
        caption,
        mediaUrls,
        status: SocialPostStatus.SCHEDULED,
        scheduleAt: new Date(),
      },
    });

    await this.scheduleRepostChain(
      companyId,
      propertyId,
      main.id,
      caption,
      mediaUrls,
      channels,
    );
  }

  private async scheduleRepostChain(
    companyId: string,
    propertyId: string,
    originalId: string,
    caption: string,
    mediaUrls: string[],
    channels: SocialChannel[],
  ): Promise<void> {
    const strategies = [
      { strategy: RepostStrategy.D1, delayMs: 86400_000 },
      { strategy: RepostStrategy.D7, delayMs: 7 * 86400_000 },
    ];
    for (const { strategy, delayMs } of strategies) {
      const exists = await this.prisma.socialPost.count({
        where: {
          companyId,
          propertyId,
          repostOfId: originalId,
          repostStrategy: strategy,
          deletedAt: null,
        },
      });
      if (exists > 0) continue;
      await this.prisma.socialPost.create({
        data: {
          companyId,
          propertyId,
          channels,
          caption,
          mediaUrls,
          repostOfId: originalId,
          repostStrategy: strategy,
          status: SocialPostStatus.SCHEDULED,
          scheduleAt: new Date(Date.now() + delayMs),
        },
      });
    }
  }

  private async schedulePriceRepost(
    companyId: string,
    propertyId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, companyId },
    });
    if (!property) return;

    const pending = await this.prisma.socialPost.count({
      where: {
        companyId,
        propertyId,
        repostStrategy: RepostStrategy.PRICE_UPDATE,
        status: SocialPostStatus.SCHEDULED,
        deletedAt: null,
      },
    });
    if (pending > 0) return;

    const original = await this.prisma.socialPost.findFirst({
      where: {
        companyId,
        propertyId,
        repostOfId: null,
        repostStrategy: null,
        status: {
          in: [SocialPostStatus.PUBLISHED, SocialPostStatus.SCHEDULED],
        },
        deletedAt: null,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    if (!original) return;

    const caption = `PRICE UPDATE\n\n${property.title}\n${Number(property.price).toLocaleString("en-US")} ${property.currency}\n\n${original.caption}`;
    await this.prisma.socialPost.create({
      data: {
        companyId,
        propertyId,
        channels: original.channels as SocialChannel[],
        caption,
        mediaUrls: original.mediaUrls,
        repostOfId: original.id,
        repostStrategy: RepostStrategy.PRICE_UPDATE,
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
        for (const channel of post.channels as SocialChannel[]) {
          const res = await this.social.publish({
            channel,
            caption: post.caption,
            mediaUrls: post.mediaUrls,
          });
          if (res.ok && res.externalId) externalRefs[channel] = res.externalId;
          else ok = false;
        }

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
