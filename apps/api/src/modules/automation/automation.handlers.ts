import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  CallCompletedPayload,
  DealStage,
  DealStageChangedPayload,
  DeliveryStatus,
  DomainEvent,
  LeadAssignedPayload,
  LeadKind,
  LeadStatus,
  LeadStatusChangedPayload,
  MatchGeneratedPayload,
  NotificationType,
  OnboardingSubmittedPayload,
  QueueName,
  RepostStrategy,
  SocialChannel,
  SocialPostStatus,
  TaskType,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { QueueService } from "../../common/queue/queue.service";
import {
  AutomationEvent,
  HandoverCreatedPayload,
  LeaseActivatedPayload,
  MaintenanceCreatedPayload,
} from "./automation.events";

const LEAD_TO_DEAL: Partial<Record<LeadStatus, DealStage>> = {
  [LeadStatus.NEW]: DealStage.LEAD,
  [LeadStatus.TO_CALL]: DealStage.CONTACTED,
  [LeadStatus.CALLING]: DealStage.CONTACTED,
  [LeadStatus.FOLLOW_UP]: DealStage.CONTACTED,
  [LeadStatus.POTENTIAL]: DealStage.QUALIFIED,
  [LeadStatus.AGREED]: DealStage.OWNER_ACCEPTED,
  [LeadStatus.IN_PORTFOLIO]: DealStage.LISTING_CREATED,
};

const STAGE_PROBABILITY: Record<DealStage, number> = {
  [DealStage.LEAD]: 10,
  [DealStage.CONTACTED]: 20,
  [DealStage.QUALIFIED]: 35,
  [DealStage.OWNER_ACCEPTED]: 45,
  [DealStage.LISTING_CREATED]: 55,
  [DealStage.PUBLISHED]: 65,
  [DealStage.BUYER_INTERESTED]: 75,
  [DealStage.OFFER]: 85,
  [DealStage.DEAL_CLOSED]: 100,
  [DealStage.LOST]: 0,
};

@Injectable()
export class PipelineSyncHandler {
  private readonly logger = new Logger(PipelineSyncHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(DomainEvent.LEAD_STATUS_CHANGED)
  async onLeadStatusChanged(payload: LeadStatusChangedPayload): Promise<void> {
    const stage = LEAD_TO_DEAL[payload.to as LeadStatus];
    if (!stage) return;

    const lead = await this.prisma.lead.findFirst({
      where: { id: payload.leadId, companyId: payload.companyId },
    });
    if (!lead) return;

    const property = await this.prisma.property.findFirst({
      where: {
        companyId: payload.companyId,
        leadId: payload.leadId,
        deletedAt: null,
      },
    });

    let deal = property
      ? await this.prisma.deal.findFirst({
          where: {
            companyId: payload.companyId,
            propertyId: property.id,
            deletedAt: null,
          },
        })
      : null;

    if (
      !deal &&
      lead.kind === LeadKind.OWNER &&
      [LeadStatus.AGREED, LeadStatus.IN_PORTFOLIO].includes(
        payload.to as LeadStatus,
      )
    ) {
      deal = await this.prisma.deal.create({
        data: {
          companyId: payload.companyId,
          branchId: payload.branchId,
          title: `${lead.fullName} — portfolio`,
          stage,
          probability: STAGE_PROBABILITY[stage],
          propertyId: property?.id,
          ownerId: lead.assignedToId,
        },
      });
      this.logger.log(`Created deal ${deal.id} for lead ${payload.leadId}`);
      return;
    }

    if (deal && deal.stage !== stage) {
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: { stage, probability: STAGE_PROBABILITY[stage] },
      });
      this.logger.log(`Synced deal ${deal.id} → ${stage}`);
    }
  }
}

@Injectable()
export class AutomationEventHandlers {
  private readonly logger = new Logger(AutomationEventHandlers.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly queue: QueueService,
  ) {}

  @OnEvent(DomainEvent.LEAD_ASSIGNED)
  async onLeadAssigned(payload: LeadAssignedPayload): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: payload.leadId, companyId: payload.companyId },
    });
    if (!lead) return;
    await this.notifications.notify({
      companyId: payload.companyId,
      userId: payload.agentId,
      type: NotificationType.LEAD_ASSIGNED,
      title: "Lead assigned",
      body: lead.fullName,
      link: `/leads/${lead.id}`,
    });
  }

  @OnEvent(DomainEvent.ONBOARDING_SUBMITTED)
  async onOnboardingSubmitted(
    payload: OnboardingSubmittedPayload,
  ): Promise<void> {
    const session = await this.prisma.onboardingSession.findFirst({
      where: { id: payload.sessionId, companyId: payload.companyId },
    });
    if (!session) return;
    const managers = await this.prisma.user.findMany({
      where: {
        companyId: payload.companyId,
        deletedAt: null,
        roles: { has: "CONTENT_MANAGER" },
      },
      select: { id: true },
      take: 5,
    });
    for (const u of managers) {
      await this.notifications.notify({
        companyId: payload.companyId,
        userId: u.id,
        type: NotificationType.NEW_PORTFOLIO,
        title: "Onboarding review pending",
        body: session.ownerName ?? "New listing submission",
        link: "/onboarding",
      });
    }
  }

  @OnEvent(DomainEvent.MATCH_GENERATED)
  async onMatchGenerated(payload: MatchGeneratedPayload): Promise<void> {
    if (payload.source !== "CUSTOMER") return;
    await this.queue.enqueue(QueueName.NOTIFICATIONS, "match-customer", {
      companyId: payload.companyId,
      customerId: payload.sourceId,
      matchCount: payload.matchCount,
    });
  }

  @OnEvent(DomainEvent.CALL_COMPLETED)
  async onCallCompleted(payload: CallCompletedPayload): Promise<void> {
    const call = await this.prisma.call.findFirst({
      where: { id: payload.callId, companyId: payload.companyId },
    });
    if (!call?.followUpAt || !call.agentId) return;

    const followUp = new Date(call.followUpAt);
    if (followUp.getTime() <= Date.now()) return;

    const lead = await this.prisma.lead.findFirst({
      where: { id: payload.leadId },
    });
    if (!lead) return;

    const exists = await this.prisma.task.findFirst({
      where: {
        companyId: payload.companyId,
        relatedEntity: "lead",
        relatedEntityId: payload.leadId,
        type: TaskType.FOLLOW_UP,
        status: { not: "DONE" },
        dueAt: followUp,
      },
    });
    if (exists) return;

    await this.prisma.task.create({
      data: {
        companyId: payload.companyId,
        branchId: payload.branchId,
        title: `Call back: ${lead.fullName}`,
        type: TaskType.FOLLOW_UP,
        priority: "HIGH",
        assigneeId: call.agentId,
        dueAt: followUp,
        relatedEntity: "lead",
        relatedEntityId: payload.leadId,
      },
    });
  }

  @OnEvent(DomainEvent.DEAL_CLOSED)
  async onDealClosed(
    payload: DealStageChangedPayload & { value: number },
  ): Promise<void> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: payload.dealId, companyId: payload.companyId },
      include: { property: { select: { id: true, title: true } } },
    });
    if (!deal?.propertyId) return;

    const original = await this.prisma.socialPost.findFirst({
      where: {
        companyId: payload.companyId,
        propertyId: deal.propertyId,
        status: SocialPostStatus.PUBLISHED,
      },
      orderBy: { publishedAt: "desc" },
    });
    if (!original) return;

    await this.prisma.socialPost.create({
      data: {
        companyId: payload.companyId,
        branchId: payload.branchId,
        propertyId: deal.propertyId,
        channels: original.channels as SocialChannel[],
        caption: `SOLD\n\n${original.caption}`,
        mediaUrls: original.mediaUrls,
        repostOfId: original.id,
        repostStrategy: RepostStrategy.PRICE_UPDATE,
        scheduleAt: new Date(),
        status: SocialPostStatus.SCHEDULED,
      },
    });
    this.logger.log(`Queued sold repost for property ${deal.propertyId}`);
  }

  @OnEvent(AutomationEvent.MAINTENANCE_CREATED)
  async onMaintenanceCreated(
    payload: MaintenanceCreatedPayload,
  ): Promise<void> {
    const assigneeId = payload.assignedToId;
    const managers = assigneeId
      ? [{ id: assigneeId }]
      : await this.prisma.user.findMany({
          where: {
            companyId: payload.companyId,
            deletedAt: null,
            roles: { hasSome: ["BRANCH_MANAGER", "SALES_AGENT"] },
          },
          select: { id: true },
          take: 3,
        });

    for (const u of managers) {
      await this.prisma.task.create({
        data: {
          companyId: payload.companyId,
          branchId: payload.branchId,
          title: `Maintenance: ${payload.title}`,
          type: TaskType.MAINTENANCE,
          priority:
            payload.priority === "URGENT" || payload.priority === "HIGH"
              ? "HIGH"
              : "MEDIUM",
          assigneeId: u.id,
          relatedEntity: "maintenance",
          relatedEntityId: payload.maintenanceId,
        },
      });
      await this.notifications.notify({
        companyId: payload.companyId,
        userId: u.id,
        type: NotificationType.MAINTENANCE,
        title: "New maintenance request",
        body: payload.title,
        link: "/rentals",
      });
    }
  }

  @OnEvent(AutomationEvent.HANDOVER_CREATED)
  async onHandoverCreated(payload: HandoverCreatedPayload): Promise<void> {
    if (!payload.agentId) return;
    await this.prisma.task.create({
      data: {
        companyId: payload.companyId,
        branchId: payload.branchId,
        title: `Handover: ${payload.type}`,
        type: TaskType.KEY_HANDOVER,
        priority: "MEDIUM",
        assigneeId: payload.agentId,
        relatedEntity: "lease",
        relatedEntityId: payload.leaseId,
      },
    });
  }

  @OnEvent(AutomationEvent.LEASE_ACTIVATED)
  async onLeaseActivated(payload: LeaseActivatedPayload): Promise<void> {
    if (!payload.agentId) return;
    await this.notifications.notify({
      companyId: payload.companyId,
      userId: payload.agentId,
      type: NotificationType.NEW_PORTFOLIO,
      title: "Lease activated",
      body: "Rent payment schedule created",
      link: "/rentals",
    });
  }

  @OnEvent(DomainEvent.CAMPAIGN_DISPATCHED)
  async onCampaignDispatched(payload: {
    companyId: string;
    campaignId: string;
  }): Promise<void> {
    const campaign = await this.prisma.messageCampaign.findFirst({
      where: { id: payload.campaignId, companyId: payload.companyId },
      include: { _count: { select: { deliveries: true } } },
    });
    if (!campaign) return;
    await this.prisma.auditLog.create({
      data: {
        companyId: payload.companyId,
        action: "CAMPAIGN_DISPATCHED",
        entity: "campaign",
        entityId: payload.campaignId,
        after: {
          name: campaign.name,
          channel: campaign.channel,
          recipientCount: campaign._count.deliveries,
        },
      },
    });
  }

  @OnEvent(DomainEvent.DELIVERY_UPDATED)
  async onDeliveryUpdated(payload: {
    companyId: string;
    deliveryId: string;
    status: string;
  }): Promise<void> {
    if (payload.status !== DeliveryStatus.DELIVERED) return;

    const delivery = await this.prisma.messageDelivery.findFirst({
      where: { id: payload.deliveryId, companyId: payload.companyId },
      include: { campaign: { select: { id: true, name: true } } },
    });
    if (!delivery) return;

    if (!delivery.campaignId) {
      await this.prisma.auditLog.create({
        data: {
          companyId: payload.companyId,
          action: "DELIVERY_UPDATED",
          entity: "delivery",
          entityId: payload.deliveryId,
          after: { status: payload.status, campaignId: null },
        },
      });
      return;
    }

    const counts = await this.prisma.messageDelivery.groupBy({
      by: ["status"],
      where: { campaignId: delivery.campaignId, companyId: payload.companyId },
      _count: { _all: true },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: payload.companyId,
        action: "DELIVERY_UPDATED",
        entity: "delivery",
        entityId: payload.deliveryId,
        after: {
          status: payload.status,
          campaignId: delivery.campaignId,
          campaignName: delivery.campaign?.name ?? null,
          campaignStats: counts.map((c) => ({
            status: c.status,
            count: c._count._all,
          })),
        },
      },
    });
  }
}
