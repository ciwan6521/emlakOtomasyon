import { Injectable, NotFoundException } from "@nestjs/common";

import {
  CommChannel,
  DeliveryStatus,
  DomainEvent,
  QueueName,
} from "@reos/shared";

import { PrismaService } from "../../common/prisma/prisma.service";

import { EventBus } from "../../common/events/event-bus";

import { QueueService } from "../../common/queue/queue.service";

import { TenantStore } from "../../common/tenant/tenant-context";

import {
  evaluateMatch,
  MATCH_THRESHOLD,
  MatchableCustomer,
  MatchableProperty,
} from "../matching/domain/match-scoring";

import { CreateCampaignDto, CreateTemplateDto } from "./dto";

@Injectable()
export class CommunicationService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly events: EventBus,

    private readonly queue: QueueService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  createTemplate(dto: CreateTemplateDto) {
    const { companyId } = TenantStore.require();

    return this.db.messageTemplate.create({
      data: { companyId: companyId!, ...dto },
    });
  }

  listTemplates() {
    return this.db.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });
  }

  async listCampaigns() {
    const campaigns = await this.db.messageCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      campaigns.map(async (c) => {
        const audience = (c.audience as { recipientIds?: string[] }) ?? {};

        const [sent, delivered, clicked] = await Promise.all([
          this.db.messageDelivery.count({
            where: {
              campaignId: c.id,
              status: {
                in: [
                  DeliveryStatus.SENT,
                  DeliveryStatus.DELIVERED,
                  DeliveryStatus.CLICKED,
                ],
              },
            },
          }),

          this.db.messageDelivery.count({
            where: {
              campaignId: c.id,
              status: {
                in: [DeliveryStatus.DELIVERED, DeliveryStatus.CLICKED],
              },
            },
          }),

          this.db.messageDelivery.count({
            where: { campaignId: c.id, status: DeliveryStatus.CLICKED },
          }),
        ]);

        return {
          id: c.id,

          name: c.name,

          channel: c.channel,

          templateId: c.templateId,

          audienceSize: audience.recipientIds?.length ?? 0,

          sentCount: sent,

          deliveredCount: delivered,

          clickedCount: clicked,

          createdAt: c.createdAt.toISOString(),
        };
      }),
    );
  }

  async createCampaign(dto: CreateCampaignDto) {
    const { companyId, branchId } = TenantStore.require();

    const customers = await this.db.customer.findMany({
      where: dto.customerIds?.length
        ? { id: { in: dto.customerIds } }
        : dto.segment
          ? { segment: dto.segment }
          : {},

      select: { id: true, phone: true, email: true, whatsapp: true },
    });

    return this.db.messageCampaign.create({
      data: {
        companyId: companyId!,

        name: dto.name,

        channel: dto.channel,

        templateId: dto.templateId,

        branchId,

        audience: { recipientIds: customers.map((c) => c.id) } as object,
      },
    });
  }

  async dispatch(campaignId: string) {
    const { companyId } = TenantStore.require();

    const campaign = await this.db.messageCampaign.findFirst({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) throw new NotFoundException("Campaign not found");

    const audience = campaign.audience as { recipientIds: string[] };

    const customers = await this.db.customer.findMany({
      where: { id: { in: audience.recipientIds } },
    });

    for (const c of customers) {
      const recipient =
        campaign.channel === CommChannel.EMAIL
          ? c.email
          : (c.whatsapp ?? c.phone);

      if (!recipient) continue;

      const body = this.render(campaign.template.body, c);

      const delivery = await this.db.messageDelivery.create({
        data: {
          companyId: companyId!,
          campaignId,
          recipientId: c.id,
          recipient,
          channel: campaign.channel,
          status: DeliveryStatus.QUEUED,
        },
      });

      await this.queue.enqueue(QueueName.COMMUNICATION, "send", {
        companyId,
        deliveryId: delivery.id,
        trackingId: delivery.trackingId,
        channel: campaign.channel,
        recipient,
        body,

        subject: campaign.template.subject ?? undefined,
      });
    }

    await this.db.messageCampaign.update({
      where: { id: campaignId },
      data: { dispatchedAt: new Date() },
    });

    this.events.publish(DomainEvent.CAMPAIGN_DISPATCHED, {
      companyId,
      campaignId,
      occurredAt: new Date().toISOString(),
    });

    return { dispatched: customers.length };
  }

  async createPropertyBroadcastCampaign(
    companyId: string,
    propertyId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, companyId },
    });

    if (!property) return;

    const customers = await this.prisma.customer.findMany({
      where: { companyId, deletedAt: null },
    });

    const p: MatchableProperty = {
      region: property.region as MatchableProperty["region"],

      type: property.type as MatchableProperty["type"],

      purpose: property.purpose as MatchableProperty["purpose"],

      price: Number(property.price),

      rooms: property.rooms,
    };

    const matchedIds: string[] = [];

    for (const c of customers) {
      const outcome = evaluateMatch(p, {
        preferredRegions:
          c.preferredRegions as MatchableCustomer["preferredRegions"],

        propertyType: c.propertyType as MatchableCustomer["propertyType"],

        budgetMin: Number(c.budgetMin),

        budgetMax: Number(c.budgetMax),

        roomRequirement: c.roomRequirement,

        preferredPurpose:
          c.preferredPurpose as MatchableCustomer["preferredPurpose"],

        kind: c.kind as MatchableCustomer["kind"],
      });

      if (outcome.score >= MATCH_THRESHOLD) matchedIds.push(c.id);
    }

    if (!matchedIds.length) return;

    let template = await this.prisma.messageTemplate.findFirst({
      where: { companyId, name: "New listing notification" },
    });

    if (!template) {
      template = await this.prisma.messageTemplate.create({
        data: {
          companyId,

          name: "New listing notification",

          channel: CommChannel.WHATSAPP,

          body: "Hi {{name}}, we have a new listing for you: {{title}} — €{{price}}. Reply for details.",
        },
      });
    }

    const campaign = await this.prisma.messageCampaign.create({
      data: {
        companyId,

        name: `Published: ${property.title}`,

        channel: CommChannel.WHATSAPP,

        templateId: template.id,

        audience: { recipientIds: matchedIds, propertyId } as object,
      },
    });

    const matchedCustomers = customers.filter((c) => matchedIds.includes(c.id));

    for (const c of matchedCustomers) {
      const recipient = c.whatsapp ?? c.phone;

      if (!recipient) continue;

      const body = template.body

        .replace(/\{\{\s*name\s*\}\}/gi, c.fullName)

        .replace(/\{\{\s*title\s*\}\}/gi, property.title)

        .replace(/\{\{\s*price\s*\}\}/gi, String(Number(property.price)));

      const delivery = await this.prisma.messageDelivery.create({
        data: {
          companyId,
          campaignId: campaign.id,
          recipientId: c.id,
          recipient,
          channel: CommChannel.WHATSAPP,
          status: DeliveryStatus.QUEUED,
          body,
        },
      });

      await this.queue.enqueue(QueueName.COMMUNICATION, "send", {
        companyId,
        deliveryId: delivery.id,
        trackingId: delivery.trackingId,

        channel: CommChannel.WHATSAPP,
        recipient,
        body,
      });
    }

    await this.prisma.messageCampaign.update({
      where: { id: campaign.id },
      data: { dispatchedAt: new Date() },
    });
  }

  async deliveries(campaignId: string) {
    return this.db.messageDelivery.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
  }

  async trackClick(trackingId: string): Promise<void> {
    await this.prisma.messageDelivery.updateMany({
      where: { trackingId },

      data: { status: DeliveryStatus.CLICKED, clickedAt: new Date() },
    });
  }

  private render(template: string, customer: { fullName: string }): string {
    return template.replace(/\{\{\s*name\s*\}\}/gi, customer.fullName);
  }
}
