import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { DomainEvent, LeadCreatedPayload, QueueName } from "@reos/shared";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { EventBus } from "../../../common/events/event-bus";
import { QueueService } from "../../../common/queue/queue.service";

@Injectable()
export class LeadsWorkers implements OnModuleInit {
  private readonly logger = new Logger(LeadsWorkers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly events: EventBus,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{
      companyId: string;
      leadId: string;
      dedupHash: string;
    }>(QueueName.DEDUP, async (job) => {
      const { companyId, leadId, dedupHash } = job.data;
      const dupes = await this.prisma.lead.count({
        where: { companyId, dedupHash, id: { not: leadId }, deletedAt: null },
      });
      if (dupes > 0) {
        await this.prisma.leadActivity.create({
          data: {
            companyId,
            leadId,
            type: "SYSTEM",
            message: `Possible duplicate detected (${dupes} match(es))`,
          },
        });
      }
    });
    this.logger.log("Lead workers registered (dedup)");
  }

  @OnEvent(DomainEvent.LEAD_CREATED)
  async autoAssign(payload: LeadCreatedPayload): Promise<void> {
    const { companyId, branchId, leadId } = payload;
    const agents = await this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
        roles: { hasSome: ["SALES_AGENT", "CALL_CENTER_AGENT"] },
      },
      select: { id: true, fullName: true },
    });
    if (agents.length === 0) return;

    const loads = await this.prisma.lead.groupBy({
      by: ["assignedToId"],
      where: {
        companyId,
        assignedToId: { in: agents.map((a) => a.id) },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const loadMap = new Map(loads.map((l) => [l.assignedToId, l._count._all]));
    const target = agents.sort(
      (a, b) => (loadMap.get(a.id) ?? 0) - (loadMap.get(b.id) ?? 0),
    )[0];

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: target.id },
    });
    await this.prisma.leadActivity.create({
      data: {
        companyId,
        leadId,
        type: "ASSIGNMENT",
        toValue: target.fullName,
        message: `Auto-assigned to ${target.fullName}`,
      },
    });

    this.events.publish(DomainEvent.LEAD_ASSIGNED, {
      companyId,
      branchId,
      leadId,
      agentId: target.id,
      occurredAt: new Date().toISOString(),
    });
    this.events.publish(DomainEvent.ASSIGNMENT_CHANGED, {
      companyId,
      branchId,
      entity: "lead",
      entityId: leadId,
      assigneeId: target.id,
      occurredAt: new Date().toISOString(),
    });
  }
}
