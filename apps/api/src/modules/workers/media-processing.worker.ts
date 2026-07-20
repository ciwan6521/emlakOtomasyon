import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { MediaType, QueueName } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";

@Injectable()
export class MediaProcessingWorker implements OnModuleInit {
  private readonly logger = new Logger(MediaProcessingWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{ companyId: string; mediaId: string }>(
      QueueName.MEDIA_PROCESSING,
      async (job) => {
        const { companyId, mediaId } = job.data;
        const media = await this.prisma.propertyMedia.findFirst({
          where: { id: mediaId, companyId, deletedAt: null },
        });
        if (!media) return;

        const updates: { thumbUrl?: string; position?: number } = {};
        if (media.type === MediaType.PHOTO && !media.thumbUrl) {
          updates.thumbUrl = media.url;
        }
        if (media.position === 0) {
          const count = await this.prisma.propertyMedia.count({
            where: { propertyId: media.propertyId, companyId, deletedAt: null },
          });
          if (count > 1) updates.position = count - 1;
        }

        if (Object.keys(updates).length) {
          await this.prisma.propertyMedia.update({
            where: { id: mediaId },
            data: updates,
          });
        }
      },
    );
    this.logger.log("Media processing worker registered");
  }
}
