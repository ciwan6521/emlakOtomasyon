import { Injectable, Logger } from "@nestjs/common";
import { LeadStatus, NotificationType, TaskType } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class CallbacksAutomationService {
  private readonly logger = new Logger(CallbacksAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async processDueCallbacks(): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 15 * 60_000);

    const leads = await this.prisma.lead.findMany({
      where: {
        followUpAt: { lte: now, gte: windowStart },
        assignedToId: { not: null },
        status: {
          notIn: [
            LeadStatus.IN_PORTFOLIO,
            LeadStatus.PASSIVE,
            LeadStatus.BLACKLIST,
          ],
        },
        deletedAt: null,
      },
      take: 100,
    });

    let sent = 0;
    for (const lead of leads) {
      if (!lead.assignedToId || !lead.followUpAt) continue;

      const recent = await this.prisma.notification.count({
        where: {
          companyId: lead.companyId,
          userId: lead.assignedToId,
          type: NotificationType.CALLBACK,
          link: "/call-center",
          createdAt: { gte: windowStart },
          body: { contains: lead.id },
        },
      });
      if (recent > 0) continue;

      await this.notifications.notify({
        companyId: lead.companyId,
        userId: lead.assignedToId,
        type: NotificationType.CALLBACK,
        title: "Callback due",
        body: `${lead.fullName} — ${lead.followUpAt.toLocaleString()} [${lead.id}]`,
        link: "/call-center",
      });

      const existingTask = await this.prisma.task.findFirst({
        where: {
          companyId: lead.companyId,
          relatedEntity: "lead",
          relatedEntityId: lead.id,
          type: TaskType.FOLLOW_UP,
          status: { not: "DONE" },
          dueAt: lead.followUpAt,
        },
      });
      if (!existingTask) {
        await this.prisma.task.create({
          data: {
            companyId: lead.companyId,
            branchId: lead.branchId,
            title: `Call back: ${lead.fullName}`,
            type: TaskType.FOLLOW_UP,
            priority: "HIGH",
            assigneeId: lead.assignedToId,
            dueAt: lead.followUpAt,
            relatedEntity: "lead",
            relatedEntityId: lead.id,
          },
        });
      }

      sent++;
    }

    if (sent) this.logger.log(`Processed ${sent} due callback(s)`);
    return sent;
  }
}
