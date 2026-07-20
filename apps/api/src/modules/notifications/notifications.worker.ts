import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { NotificationType, QueueName } from "@reos/shared";
import { QueueService } from "../../common/queue/queue.service";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class NotificationsWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationsWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{
      companyId: string;
      propertyId?: string;
      customerId?: string;
      matchCount?: number;
      userId?: string;
      type?: NotificationType;
      title?: string;
      body?: string;
      link?: string;
    }>(QueueName.NOTIFICATIONS, async (job) => {
      const {
        companyId,
        propertyId,
        customerId,
        matchCount,
        userId,
        type,
        title,
        body,
        link,
      } = job.data;

      if (type && userId && title) {
        await this.notifications.notify({
          companyId,
          userId,
          type,
          title,
          body,
          link,
        });
        return;
      }

      if (propertyId && matchCount) {
        const property = await this.prisma.property.findFirst({
          where: { id: propertyId, companyId },
        });
        const managers = await this.prisma.user.findMany({
          where: {
            companyId,
            deletedAt: null,
            roles: {
              hasSome: ["COMPANY_OWNER", "BRANCH_MANAGER", "SALES_AGENT"],
            },
          },
          select: { id: true },
          take: 20,
        });
        for (const u of managers) {
          await this.notifications.notify({
            companyId,
            userId: u.id,
            type: NotificationType.MATCH,
            title: `${matchCount} customer matches`,
            body: property
              ? `${property.title} — ready for outreach`
              : undefined,
            link: propertyId ? `/properties` : undefined,
          });
        }
        return;
      }

      if (customerId && matchCount) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: customerId, companyId },
        });
        const managers = await this.prisma.user.findMany({
          where: {
            companyId,
            deletedAt: null,
            roles: {
              hasSome: ["COMPANY_OWNER", "BRANCH_MANAGER", "SALES_AGENT"],
            },
          },
          select: { id: true },
          take: 20,
        });
        for (const u of managers) {
          await this.notifications.notify({
            companyId,
            userId: u.id,
            type: NotificationType.MATCH,
            title: `${matchCount} listing matches`,
            body: customer
              ? `${customer.fullName} portfolio matches`
              : undefined,
            link: `/matching`,
          });
        }
      }
    });
    this.logger.log("Notifications worker registered");
  }
}
