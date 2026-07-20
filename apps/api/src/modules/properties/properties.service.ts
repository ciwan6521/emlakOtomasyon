import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DomainEvent,
  NotificationType,
  Paginated,
  PROPERTY_TRANSITIONS,
  PropertyBroadcastAudience,
  PropertyDto,
  PropertyStatus,
  QueueName,
} from "@reos/shared";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { QueueService } from "../../common/queue/queue.service";
import { ContactMaskingService } from "../../common/security/contact-masking.service";
import { StorageService } from "../../common/storage/storage.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import {
  evaluateMatch,
  MATCH_THRESHOLD,
  MatchableCustomer,
  MatchableProperty,
} from "../matching/domain/match-scoring";
import { computeDedupHash } from "../leads/domain/lead-scoring";
import {
  AddMediaDto,
  CreatePropertyDto,
  ListPropertiesQuery,
  PresignMediaDto,
  TransitionPropertyDto,
  TranslateDto,
  UpdatePropertyDto,
} from "./dto";

const refId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const slugGen = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly queue: QueueService,
    private readonly masking: ContactMaskingService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private async socialUrls(
    propertyId: string,
  ): Promise<{ instagramUrl: string | null; facebookUrl: string | null }> {
    const posts = await this.db.socialPost.findMany({
      where: { propertyId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
    });
    let instagramUrl: string | null = null;
    let facebookUrl: string | null = null;
    for (const p of posts) {
      const refs = (p.externalRefs ?? {}) as Record<string, string>;
      if (!instagramUrl && refs.instagram) instagramUrl = refs.instagram;
      if (!facebookUrl && refs.facebook) facebookUrl = refs.facebook;
      if (instagramUrl && facebookUrl) break;
    }
    return { instagramUrl, facebookUrl };
  }

  private async userName(
    id: string | null | undefined,
  ): Promise<string | null> {
    if (!id) return null;
    const u = await this.prisma.user.findFirst({
      where: { id },
      select: { fullName: true },
    });
    return u?.fullName ?? null;
  }

  private async toDtoAsync(
    p: any,
    extras?: { instagramUrl?: string | null; facebookUrl?: string | null },
  ): Promise<PropertyDto> {
    const [createdByName, updatedByName] = await Promise.all([
      this.userName(p.createdById),
      this.userName(p.updatedById),
    ]);
    return this.toDto(p, { ...extras, createdByName, updatedByName });
  }

  private toDto(
    p: any,
    extras?: {
      instagramUrl?: string | null;
      facebookUrl?: string | null;
      createdByName?: string | null;
      updatedByName?: string | null;
    },
  ): PropertyDto {
    const cover = p.media?.find((m: any) => m.isCover) ?? p.media?.[0];
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
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
      price: Number(p.price),
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
      createdByName: extras?.createdByName ?? null,
      updatedByName: extras?.updatedByName ?? null,
      instagramUrl: extras?.instagramUrl ?? null,
      facebookUrl: extras?.facebookUrl ?? null,
      ownerName: p.ownerName,
      ownerPhone: this.masking.phone(p.ownerPhone, { branchId: p.branchId }),
      description: p.description ?? null,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      mediaCount: p._count?.media ?? p.media?.length ?? 0,
      coverUrl: cover?.url ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async create(dto: CreatePropertyDto): Promise<PropertyDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const reference = `${dto.region.slice(0, 3)}-${refId()}`;
    const dedupHash = computeDedupHash({
      phone: dto.ownerPhone,
      address: dto.address,
    });

    const property = await this.db.property.create({
      data: {
        companyId: companyId!,
        reference,
        title: dto.title,
        type: dto.type,
        purpose: dto.purpose,
        region: dto.region,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        price: dto.price,
        pricePeriod:
          dto.pricePeriod ?? (dto.purpose === "RENT" ? "MONTHLY" : "TOTAL"),
        rentalTermType: dto.rentalTermType,
        availableFrom: dto.availableFrom
          ? new Date(dto.availableFrom)
          : undefined,
        minLeaseMonths: dto.minLeaseMonths,
        minStayNights: dto.minStayNights,
        nightlyRate: dto.nightlyRate,
        depositAmount: dto.depositAmount,
        managementFeePct: dto.managementFeePct,
        rooms: dto.rooms,
        sizeM2: dto.sizeM2,
        neighborhood: dto.neighborhood,
        floor: dto.floor,
        buildType: dto.buildType,
        monthlyDues: dto.monthlyDues,
        hasElevator: dto.hasElevator ?? false,
        hasParking: dto.hasParking ?? false,
        hasBalcony: dto.hasBalcony ?? false,
        isFurnished: dto.isFurnished ?? false,
        hasSeaView: dto.hasSeaView ?? false,
        hasPool: dto.hasPool ?? false,
        hasGarden: dto.hasGarden ?? false,
        ownerName: dto.ownerName,
        ownerPhone: dto.ownerPhone,
        ownerEmail: dto.ownerEmail,
        description: dto.description,
        leadId: dto.leadId,
        dedupHash,
        branchId,
        createdById: userId,
        updatedById: userId,
      },
      include: { media: true, _count: { select: { media: true } } },
    });

    this.events.publish(DomainEvent.PROPERTY_CREATED, {
      companyId,
      branchId,
      propertyId: property.id,
      occurredAt: new Date().toISOString(),
    });
    await this.queue.enqueue(QueueName.AI, "describe", {
      companyId,
      propertyId: property.id,
    });
    await this.queue.enqueue(QueueName.MATCHING, "property", {
      companyId,
      propertyId: property.id,
    });
    return this.toDtoAsync(property);
  }

  async list(query: ListPropertiesQuery): Promise<Paginated<PropertyDto>> {
    const where: Record<string, unknown> = {};
    if (query.region) where.region = query.region;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.purpose) where.purpose = query.purpose;
    if (query.rooms) where.rooms = query.rooms;
    if (query.floor != null) where.floor = query.floor;
    if (query.neighborhood)
      where.neighborhood = {
        contains: query.neighborhood,
        mode: "insensitive",
      };
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {
        ...(query.minPrice != null ? { gte: query.minPrice } : {}),
        ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
      };
    }
    if (query.minSizeM2 != null || query.maxSizeM2 != null) {
      where.sizeM2 = {
        ...(query.minSizeM2 != null ? { gte: query.minSizeM2 } : {}),
        ...(query.maxSizeM2 != null ? { lte: query.maxSizeM2 } : {}),
      };
    }
    if (query.buildType) where.buildType = query.buildType;
    for (const f of [
      "hasElevator",
      "hasParking",
      "hasBalcony",
      "isFurnished",
      "hasSeaView",
      "hasPool",
      "hasGarden",
    ] as const) {
      if (query[f] === true) where[f] = true;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { reference: { contains: query.search, mode: "insensitive" } },
        { address: { contains: query.search, mode: "insensitive" } },
        { neighborhood: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.bbox) {
      const [minLng, minLat, maxLng, maxLat] = query.bbox
        .split(",")
        .map(Number);
      where.latitude = { gte: minLat, lte: maxLat };
      where.longitude = { gte: minLng, lte: maxLng };
    }

    const [rows, total] = await Promise.all([
      this.db.property.findMany({
        where,
        include: {
          media: { where: { deletedAt: null } },
          _count: { select: { media: true } },
        },
        orderBy: query.orderBy("createdAt"),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.property.count({ where }),
    ]);

    const dtos = await Promise.all(rows.map((r) => this.toDtoAsync(r)));
    return paginate(dtos, total, query.page, query.pageSize);
  }

  async get(id: string) {
    const p = await this.db.property.findFirst({
      where: { id },
      include: {
        media: { orderBy: { position: "asc" } },
        translations: true,
        _count: { select: { media: true } },
      },
    });
    if (!p) throw new NotFoundException("Property not found");
    this.db.property
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
    const social = await this.socialUrls(id);
    const dto = await this.toDtoAsync(p, social);
    return {
      ...dto,
      viewCount: (p.viewCount ?? 0) + 1,
      translations: p.translations,
      media: p.media,
    };
  }

  async incrementSentCount(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.db.property.updateMany({
      where: { id: { in: ids } },
      data: { sentCount: { increment: 1 } },
    });
  }

  async favorite(id: string): Promise<{ favoriteCount: number }> {
    await this.ensureExists(id);
    const p = await this.db.property.update({
      where: { id },
      data: { favoriteCount: { increment: 1 } },
    });
    return { favoriteCount: p.favoriteCount };
  }

  async broadcastAudience(id: string): Promise<PropertyBroadcastAudience> {
    const { companyId } = TenantStore.require();
    const property = await this.db.property.findFirst({ where: { id } });
    if (!property) throw new NotFoundException("Property not found");

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

    const matched: PropertyBroadcastAudience["customers"] = [];
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
      if (outcome.score >= MATCH_THRESHOLD) {
        matched.push({
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          score: outcome.score,
        });
      }
    }
    matched.sort((a, b) => b.score - a.score);
    return {
      propertyId: id,
      matchCount: matched.length,
      customers: matched.slice(0, 100),
    };
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<PropertyDto> {
    const { companyId, userId } = TenantStore.require();
    const current = await this.db.property.findFirst({ where: { id } });
    if (!current) throw new NotFoundException("Property not found");

    const { availableFrom, ...rest } = dto;
    const p = await this.db.property.update({
      where: { id },
      data: {
        ...rest,
        ...(availableFrom !== undefined
          ? { availableFrom: availableFrom ? new Date(availableFrom) : null }
          : {}),
        updatedById: userId,
      },
      include: { media: true, _count: { select: { media: true } } },
    });

    if (dto.price != null && Number(current.price) !== dto.price) {
      await this.prisma.priceHistory.create({
        data: {
          companyId: companyId!,
          propertyId: id,
          oldPrice: current.price,
          newPrice: dto.price,
          actorId: userId,
        },
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
        take: 10,
      });
      for (const m of managers) {
        await this.notifications.notify({
          companyId,
          userId: m.id,
          type: NotificationType.PRICE_UPDATED,
          title: "Price updated",
          body: `${current.title}: €${Number(current.price)} → €${dto.price}`,
          link: `/properties`,
        });
      }
      await this.queue.enqueue(QueueName.SOCIAL, "price-repost", {
        companyId,
        propertyId: id,
      });
    }

    return this.toDtoAsync(p);
  }

  async transition(
    id: string,
    dto: TransitionPropertyDto,
  ): Promise<PropertyDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const current = await this.db.property.findFirst({ where: { id } });
    if (!current) throw new NotFoundException("Property not found");
    if (
      !PROPERTY_TRANSITIONS[current.status as PropertyStatus].includes(dto.to)
    ) {
      throw new BadRequestException(
        `Illegal transition ${current.status} → ${dto.to}`,
      );
    }
    const p = await this.db.property.update({
      where: { id },
      data: {
        status: dto.to,
        updatedById: userId,
        ...(dto.to === PropertyStatus.ACTIVE_LISTING
          ? { publishedAt: new Date() }
          : {}),
      },
      include: { media: true, _count: { select: { media: true } } },
    });
    this.events.publish(DomainEvent.PROPERTY_STATUS_CHANGED, {
      companyId,
      branchId,
      propertyId: id,
      occurredAt: new Date().toISOString(),
    });
    return this.toDtoAsync(p);
  }

  async publish(id: string): Promise<PropertyDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const current = await this.db.property.findFirst({
      where: { id },
      include: { _count: { select: { media: true } } },
    });
    if (!current) throw new NotFoundException("Property not found");
    if (current._count.media === 0)
      throw new BadRequestException("Cannot publish a property without media");

    const publicSlug = current.publicSlug ?? slugGen();
    const p = await this.db.property.update({
      where: { id },
      data: {
        status: PropertyStatus.ACTIVE_LISTING,
        publishedAt: new Date(),
        publicSlug,
        updatedById: userId,
      },
      include: { media: true, _count: { select: { media: true } } },
    });

    this.events.publish(DomainEvent.PROPERTY_PUBLISHED, {
      companyId,
      branchId,
      propertyId: id,
      occurredAt: new Date().toISOString(),
    });
    await this.queue.enqueue(QueueName.MATCHING, "property", {
      companyId,
      propertyId: id,
    });
    await this.queue.enqueue(QueueName.SOCIAL, "autopost", {
      companyId,
      propertyId: id,
    });
    await this.queue.enqueue(QueueName.COMMUNICATION, "property-broadcast", {
      companyId,
      propertyId: id,
    });
    return this.toDtoAsync(p);
  }

  async addMedia(id: string, dto: AddMediaDto) {
    const { companyId } = TenantStore.require();
    await this.ensureExists(id);
    if (dto.isCover) {
      await this.db.propertyMedia.updateMany({
        where: { propertyId: id, isCover: true },
        data: { isCover: false },
      });
    }
    const media = await this.db.propertyMedia.create({
      data: { companyId: companyId!, propertyId: id, ...dto },
    });
    await this.queue.enqueue(QueueName.MEDIA_PROCESSING, "process", {
      companyId: companyId!,
      mediaId: media.id,
    });
    return media;
  }

  async presignMedia(id: string, dto: PresignMediaDto) {
    const { companyId } = TenantStore.require();
    await this.ensureExists(id);
    return this.storage.presignUpload({
      prefix: `properties/${companyId}/${id}`,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }

  async translate(id: string, dto: TranslateDto) {
    const { companyId } = TenantStore.require();
    await this.ensureExists(id);
    await this.queue.enqueue(QueueName.AI, "translate", {
      companyId,
      propertyId: id,
      locales: dto.locales,
    });
    return { queued: true, locales: dto.locales };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.db.property.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Property not found");
  }
}
