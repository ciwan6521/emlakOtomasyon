import { Injectable } from "@nestjs/common";
import { DomainEvent, ListingPurpose, QueueName } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { QueueService } from "../../common/queue/queue.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import {
  evaluateMatch,
  MATCH_THRESHOLD,
  MatchableCustomer,
  MatchableProperty,
} from "./domain/match-scoring";

function toMatchableCustomer(c: {
  preferredRegions: string[];
  propertyType: string | null;
  budgetMin: unknown;
  budgetMax: unknown;
  roomRequirement: string | null;
  preferredPurpose?: string | null;
  kind: string;
}): MatchableCustomer {
  return {
    preferredRegions:
      c.preferredRegions as MatchableCustomer["preferredRegions"],
    propertyType: c.propertyType as MatchableCustomer["propertyType"],
    budgetMin: Number(c.budgetMin),
    budgetMax: Number(c.budgetMax),
    roomRequirement: c.roomRequirement,
    preferredPurpose:
      (c.preferredPurpose as ListingPurpose | null) ??
      (c.kind === "TENANT"
        ? ListingPurpose.RENT
        : c.kind === "BUYER"
          ? ListingPurpose.SALE
          : null),
    kind: c.kind as MatchableCustomer["kind"],
  };
}

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly queue: QueueService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  async matchForProperty(
    companyId: string,
    propertyId: string,
  ): Promise<number> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, companyId },
    });
    if (!property) return 0;

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

    let count = 0;
    for (const c of customers) {
      const outcome = evaluateMatch(p, toMatchableCustomer(c));
      if (outcome.score < MATCH_THRESHOLD) continue;
      await this.prisma.match.upsert({
        where: { propertyId_customerId: { propertyId, customerId: c.id } },
        create: {
          companyId,
          propertyId,
          customerId: c.id,
          score: outcome.score,
          reasons: outcome.reasons,
        },
        update: { score: outcome.score, reasons: outcome.reasons },
      });
      count++;
    }

    if (count > 0) {
      this.events.publish(DomainEvent.MATCH_GENERATED, {
        companyId,
        source: "PROPERTY",
        sourceId: propertyId,
        matchCount: count,
        occurredAt: new Date().toISOString(),
      });
      await this.queue.enqueue(QueueName.NOTIFICATIONS, "match-property", {
        companyId,
        propertyId,
        matchCount: count,
      });
    }
    return count;
  }

  async matchForCustomer(
    companyId: string,
    customerId: string,
  ): Promise<number> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });
    if (!customer) return 0;

    const purposeFilter =
      customer.preferredPurpose ??
      (customer.kind === "TENANT"
        ? ListingPurpose.RENT
        : customer.kind === "BUYER"
          ? ListingPurpose.SALE
          : undefined);

    const properties = await this.prisma.property.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: "ACTIVE_LISTING",
        ...(purposeFilter ? { purpose: purposeFilter } : {}),
      },
    });
    const c = toMatchableCustomer(customer);

    let count = 0;
    for (const property of properties) {
      const outcome = evaluateMatch(
        {
          region: property.region as MatchableProperty["region"],
          type: property.type as MatchableProperty["type"],
          purpose: property.purpose as MatchableProperty["purpose"],
          price: Number(property.price),
          rooms: property.rooms,
        },
        c,
      );
      if (outcome.score < MATCH_THRESHOLD) continue;
      await this.prisma.match.upsert({
        where: {
          propertyId_customerId: { propertyId: property.id, customerId },
        },
        create: {
          companyId,
          propertyId: property.id,
          customerId,
          score: outcome.score,
          reasons: outcome.reasons,
        },
        update: { score: outcome.score, reasons: outcome.reasons },
      });
      count++;
    }

    if (count > 0) {
      this.events.publish(DomainEvent.MATCH_GENERATED, {
        companyId,
        source: "CUSTOMER",
        sourceId: customerId,
        matchCount: count,
        occurredAt: new Date().toISOString(),
      });
    }
    return count;
  }

  async forProperty(propertyId: string) {
    return this.db.match.findMany({
      where: { propertyId },
      orderBy: { score: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            segment: true,
            budgetMin: true,
            budgetMax: true,
            kind: true,
          },
        },
      },
    });
  }

  async forCustomer(customerId: string) {
    return this.db.match.findMany({
      where: { customerId },
      orderBy: { score: "desc" },
      include: {
        property: {
          select: {
            id: true,
            reference: true,
            title: true,
            price: true,
            region: true,
            rooms: true,
            purpose: true,
          },
        },
      },
    });
  }

  async runNow(params: { propertyId?: string; customerId?: string }) {
    const companyId = TenantStore.companyId()!;
    if (params.propertyId)
      return {
        matched: await this.matchForProperty(companyId, params.propertyId),
      };
    if (params.customerId)
      return {
        matched: await this.matchForCustomer(companyId, params.customerId),
      };
    return { matched: 0 };
  }
}
