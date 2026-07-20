import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Locale, QueueName } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";
import { AiAdapter, ListingContext } from "../integrations/ai.adapter";

interface AiJob {
  companyId: string;
  propertyId: string;
  locales?: Locale[];
}

@Injectable()
export class AiWorker implements OnModuleInit {
  private readonly logger = new Logger(AiWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
    private readonly ai: AiAdapter,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<AiJob>(QueueName.AI, async (job) => {
      const { companyId, propertyId, locales } = job.data;
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, companyId },
      });
      if (!property) return;

      const ctx: ListingContext = {
        title: property.title,
        type: property.type,
        region: property.region,
        rooms: property.rooms,
        sizeM2: property.sizeM2,
        price: Number(property.price),
        currency: property.currency,
      };

      const targetLocales =
        job.name === "translate" && locales?.length ? locales : [Locale.EN];
      for (const locale of targetLocales) {
        const { title, description } = await this.ai.describe(ctx, locale);
        await this.prisma.propertyTranslation.upsert({
          where: { propertyId_locale: { propertyId, locale } },
          create: { propertyId, locale, title, description, aiGenerated: true },
          update: { title, description, aiGenerated: true },
        });
        if (locale === Locale.EN && !property.description) {
          await this.prisma.property.update({
            where: { id: propertyId },
            data: { description },
          });
        }
      }
    });
    this.logger.log("AI worker registered (describe + translate)");
  }
}
