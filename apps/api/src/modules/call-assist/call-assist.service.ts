import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CallAssistCard,
  CallAssistSearchResponse,
  CallAssistSendResult,
  CommChannel,
  DeliveryStatus,
  parseListingQuery,
  PropertyStatus,
  QueueName,
  SocialChannel,
  SocialLink,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { CallAssistSearchDto, CallAssistSendDto } from "./dto";
import { Filters, rankProperty, toFilters } from "./domain/relevance";

const DEFAULT_LIMIT = 18;

@Injectable()
export class CallAssistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  async search(dto: CallAssistSearchDto): Promise<CallAssistSearchResponse> {
    const parsed = parseListingQuery(dto.q ?? "");
    const filters = toFilters(parsed, {
      region: dto.region,
      rooms: dto.rooms,
      type: dto.type,
      purpose: dto.purpose,
      budgetMin: dto.minPrice,
      budgetMax: dto.maxPrice,
    });

    const where: Record<string, unknown> = {
      status: PropertyStatus.ACTIVE_LISTING,
    };
    if (filters.region) where.region = filters.region;
    if (filters.purpose) where.purpose = filters.purpose;
    if (filters.type) where.type = filters.type;
    if (filters.budgetMin != null || filters.budgetMax != null) {
      where.price = {
        ...(filters.budgetMin != null ? { gte: filters.budgetMin } : {}),
        // 10% tolerance over the ceiling so near-budget options still surface.
        ...(filters.budgetMax != null
          ? { lte: Math.round(filters.budgetMax * 1.1) }
          : {}),
      };
    }

    const rows = await this.db.property.findMany({
      where,
      include: {
        media: { where: { deletedAt: null }, orderBy: { position: "asc" } },
        _count: { select: { media: true } },
      },
      take: 100,
    });

    const socialByProperty = await this.loadSocialLinks(rows.map((r) => r.id));

    const limit = dto.limit ?? DEFAULT_LIMIT;
    const cards = rows
      .map((p) => this.toCard(p, filters, socialByProperty.get(p.id) ?? []))
      .sort((a, b) => b.relevance - a.relevance || b.price - a.price)
      .slice(0, limit);

    return {
      parsed,
      results: cards,
      suggestedMessage: this.buildMessage(cards.slice(0, 3), filters),
    };
  }

  async send(dto: CallAssistSendDto): Promise<CallAssistSendResult> {
    const { companyId } = TenantStore.require();
    if (dto.channel === CommChannel.EMAIL && !dto.recipient.includes("@")) {
      throw new BadRequestException(
        "A valid email recipient is required for the EMAIL channel",
      );
    }

    const properties = await this.db.property.findMany({
      where: {
        id: { in: dto.propertyIds },
        status: PropertyStatus.ACTIVE_LISTING,
      },
      include: {
        media: { where: { deletedAt: null }, orderBy: { position: "asc" } },
      },
    });
    if (properties.length === 0)
      throw new NotFoundException("No active listings found for the selection");

    const social = await this.loadSocialLinks(properties.map((p) => p.id));
    const body =
      dto.message?.trim() ||
      this.buildMessage(
        properties.map((p) => this.toCard(p, {}, social.get(p.id) ?? [])),
        {},
      );

    const delivery = await this.db.messageDelivery.create({
      data: {
        companyId: companyId!,
        recipient: dto.recipient,
        recipientId: dto.customerId,
        channel: dto.channel,
        status: DeliveryStatus.QUEUED,
        body,
        context: "CALL_ASSIST",
      },
    });

    await this.queue.enqueue(QueueName.COMMUNICATION, "send", {
      companyId,
      deliveryId: delivery.id,
      trackingId: delivery.trackingId,
      channel: dto.channel,
      recipient: dto.recipient,
      body,
    });

    // Track how many times each listing was shared with customers.
    await this.db.property.updateMany({
      where: { id: { in: properties.map((p) => p.id) } },
      data: { sentCount: { increment: 1 } },
    });

    return {
      sent: properties.length,
      channel: dto.channel,
      recipient: dto.recipient,
      deliveryIds: [delivery.id],
    };
  }

  private toCard(
    p: any,
    filters: Filters,
    socialLinks: SocialLink[],
  ): CallAssistCard {
    const cover = p.media?.find((m: any) => m.isCover) ?? p.media?.[0];
    const { relevance, reasons } = rankProperty(
      {
        region: p.region,
        type: p.type,
        purpose: p.purpose,
        price: Number(p.price),
        rooms: p.rooms,
      },
      filters,
    );
    const price = Number(p.price);
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
    const ig = socialLinks.find((l) => l.channel === "INSTAGRAM")?.url ?? null;
    const fb = socialLinks.find((l) => l.channel === "FACEBOOK")?.url ?? null;
    return {
      id: p.id,
      reference: p.reference,
      title: p.title,
      type: p.type,
      purpose: p.purpose,
      status: p.status,
      region: p.region,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      price,
      pricePeriod: p.pricePeriod ?? "TOTAL",
      rentalTermType: p.rentalTermType ?? null,
      availableFrom: p.availableFrom?.toISOString() ?? null,
      minLeaseMonths: p.minLeaseMonths ?? null,
      minStayNights: p.minStayNights ?? null,
      nightlyRate: p.nightlyRate != null ? Number(p.nightlyRate) : null,
      depositAmount: p.depositAmount != null ? Number(p.depositAmount) : null,
      managementFeePct: p.managementFeePct ?? null,
      currency: p.currency,
      rooms: p.rooms,
      sizeM2: p.sizeM2,
      neighborhood: p.neighborhood ?? null,
      floor: p.floor ?? null,
      buildType: p.buildType ?? null,
      monthlyDues: p.monthlyDues != null ? Number(p.monthlyDues) : null,
      hasElevator: !!p.hasElevator,
      hasParking: !!p.hasParking,
      hasBalcony: !!p.hasBalcony,
      isFurnished: !!p.isFurnished,
      hasSeaView: !!p.hasSeaView,
      hasPool: !!p.hasPool,
      hasGarden: !!p.hasGarden,
      viewCount: p.viewCount ?? 0,
      sentCount: p.sentCount ?? 0,
      favoriteCount: p.favoriteCount ?? 0,
      publicUrl: p.publicSlug ? `${baseUrl}/listing/${p.publicSlug}` : null,
      createdByName: null,
      updatedByName: null,
      instagramUrl: ig,
      facebookUrl: fb,
      ownerName: p.ownerName,
      ownerPhone: "", // owner contact intentionally omitted from call-assist cards
      description: p.description ?? null,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      mediaCount: p._count?.media ?? p.media?.length ?? 0,
      coverUrl: cover?.url ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      relevance,
      matchReasons: reasons,
      socialLinks,
      shareText: `${p.title} — ${p.rooms}, ${p.sizeM2} m² in ${cap(p.region)} — ${price.toLocaleString("en-US")} ${p.currency} (Ref ${p.reference})`,
    };
  }

  private async loadSocialLinks(
    propertyIds: string[],
  ): Promise<Map<string, SocialLink[]>> {
    const map = new Map<string, SocialLink[]>();
    if (propertyIds.length === 0) return map;
    const posts = await this.db.socialPost.findMany({
      where: { propertyId: { in: propertyIds }, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
    });
    for (const post of posts) {
      if (!post.propertyId) continue;
      const refs = (post.externalRefs ?? {}) as Record<string, string>;
      const links = map.get(post.propertyId) ?? [];
      for (const channel of post.channels as SocialChannel[]) {
        if (links.some((l) => l.channel === channel)) continue;
        const url = buildSocialUrl(channel, refs[channel]);
        if (url) links.push({ channel, url });
      }
      map.set(post.propertyId, links);
    }
    return map;
  }

  private buildMessage(
    cards: Array<{ shareText: string; socialLinks: SocialLink[] }>,
    filters: Filters,
  ): string {
    if (cards.length === 0)
      return "Hi! I could not find matching listings right now, but I will follow up shortly.";
    const intro = filters.region
      ? `Hi! Here are some great options in ${cap(filters.region)}:`
      : "Hi! Here are some options that match what we discussed:";
    const lines = cards.map((c, i) => {
      const link = c.socialLinks[0]?.url ? `\n   ${c.socialLinks[0].url}` : "";
      return `${i + 1}. ${c.shareText}${link}`;
    });
    return `${intro}\n\n${lines.join("\n")}\n\nLet me know which one you'd like to view!`;
  }
}

function buildSocialUrl(
  channel: SocialChannel,
  externalId?: string,
): string | null {
  if (!externalId) return null;
  const id = externalId.replace(/^sim_[A-Z]+_/, "");
  if (channel === SocialChannel.INSTAGRAM)
    return `https://www.instagram.com/p/${id}/`;
  if (channel === SocialChannel.FACEBOOK)
    return `https://www.facebook.com/${id}`;
  return null;
}

const cap = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
