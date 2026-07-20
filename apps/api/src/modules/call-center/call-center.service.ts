import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CallResult,
  CallResultRequest,
  DomainEvent,
  LeadStatus,
  NotificationType,
  OwnerRating,
  TaskType,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { ContactMaskingService } from "../../common/security/contact-masking.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { NotificationsService } from "../notifications/notifications.service";

const RESULT_TO_LEAD_STATUS: Partial<Record<CallResult, LeadStatus>> = {
  [CallResult.FOLLOW_UP]: LeadStatus.FOLLOW_UP,
  [CallResult.NOT_INTERESTED]: LeadStatus.PASSIVE,
  [CallResult.HOT_LEAD]: LeadStatus.POTENTIAL,
  [CallResult.AGREED]: LeadStatus.AGREED,
  [CallResult.DEAL_IN_PROGRESS]: LeadStatus.CALLING,
  [CallResult.CONVERTED]: LeadStatus.IN_PORTFOLIO,
  [CallResult.SELLING_OWN]: LeadStatus.PASSIVE,
  [CallResult.WITH_COMPETITOR]: LeadStatus.PASSIVE,
  [CallResult.UNREACHABLE]: LeadStatus.TO_CALL,
  [CallResult.BUSY]: LeadStatus.TO_CALL,
};

@Injectable()
export class CallCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly masking: ContactMaskingService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  async queue(limit = 20) {
    const { userId } = TenantStore.require();
    const leads = await this.db.lead.findMany({
      where: {
        assignedToId: userId,
        status: {
          in: [
            LeadStatus.NEW,
            LeadStatus.TO_CALL,
            LeadStatus.CALLING,
            LeadStatus.FOLLOW_UP,
            LeadStatus.POTENTIAL,
          ],
        },
      },
      orderBy: [{ score: "desc" }, { followUpAt: "asc" }],
      take: limit,
    });
    return leads.map((l) => ({
      leadId: l.id,
      fullName: l.fullName,
      phone: this.masking.phone(l.phone, {
        assignedToId: l.assignedToId,
        branchId: l.branchId,
      }),
      score: l.score,
      status: l.status,
      followUpAt: l.followUpAt,
      ownerRating: l.ownerRating,
      lastNote: l.lastNote,
      listingUrl: l.listingUrl,
      listingPhotoUrl: l.listingPhotoUrl,
    }));
  }

  async logResult(leadId: string, dto: CallResultRequest) {
    const { companyId, branchId, userId } = TenantStore.require();
    const lead = await this.db.lead.findFirst({ where: { id: leadId } });
    if (!lead) throw new NotFoundException("Lead not found");

    const now = new Date();
    const call = await this.db.call.create({
      data: {
        companyId,
        leadId,
        branchId,
        agentId: userId,
        direction: "OUTBOUND",
        result: dto.result,
        notes: dto.notes,
        durationSec: dto.durationSec,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null,
        endedAt: now,
      },
    });

    const nextStatus = RESULT_TO_LEAD_STATUS[dto.result];
    const updateData: Record<string, unknown> = {
      lastCallAt: now,
      lastCallResult: dto.result,
      lastNote: dto.notes ?? lead.lastNote,
      ...(dto.ownerRating ? { ownerRating: dto.ownerRating } : {}),
      ...(dto.followUpAt ? { followUpAt: new Date(dto.followUpAt) } : {}),
    };

    if (nextStatus && nextStatus !== lead.status) {
      updateData.status = nextStatus;
      updateData.activities = {
        create: {
          companyId,
          type: "CALL",
          fromValue: lead.status,
          toValue: nextStatus,
          message: `Call result: ${dto.result}`,
        },
      };
    } else if (dto.notes) {
      updateData.activities = {
        create: { companyId, type: "NOTE", message: dto.notes },
      };
    }

    await this.db.lead.update({ where: { id: leadId }, data: updateData });

    if (nextStatus && nextStatus !== lead.status) {
      this.events.publish(DomainEvent.LEAD_STATUS_CHANGED, {
        companyId,
        branchId,
        leadId,
        from: lead.status,
        to: nextStatus,
        occurredAt: now.toISOString(),
      });
    }

    this.events.publish(DomainEvent.CALL_COMPLETED, {
      companyId,
      branchId,
      callId: call.id,
      leadId,
      result: dto.result,
      occurredAt: now.toISOString(),
    });

    if (dto.followUpAt && userId) {
      const followUp = new Date(dto.followUpAt);
      const notifyNow = followUp.getTime() <= Date.now() + 15 * 60_000;
      if (notifyNow) {
        await this.notifications.notify({
          companyId,
          userId,
          type: NotificationType.CALLBACK,
          title: "Callback reminder",
          body: `${lead.fullName} — ${followUp.toLocaleString()} [${lead.id}]`,
          link: "/call-center",
        });
      }
    }

    // Owner agreed → onboarding flow.
    if (
      lead.kind === "OWNER" &&
      (dto.result === CallResult.AGREED ||
        dto.result === CallResult.CONVERTED ||
        dto.result === CallResult.DEAL_IN_PROGRESS)
    ) {
      this.events.publish(DomainEvent.OWNER_ACCEPTED, {
        companyId,
        branchId,
        leadId,
        occurredAt: now.toISOString(),
      });
    }

    // Persist owner rating on profile when provided.
    if (dto.ownerRating && lead.phone) {
      const profile = await this.db.ownerProfile.findFirst({
        where: { phone: lead.phone },
      });
      if (profile) {
        await this.db.ownerProfile.update({
          where: { id: profile.id },
          data: { rating: dto.ownerRating },
        });
      }
    }

    return call;
  }

  async audit(params: {
    agentId?: string;
    result?: CallResult;
    from?: string;
    to?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.agentId) where.agentId = params.agentId;
    if (params.result) where.result = params.result;
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    return this.db.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        agent: { select: { id: true, fullName: true } },
        lead: { select: { id: true, fullName: true } },
      },
    });
  }
}
