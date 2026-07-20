import { Injectable, NotFoundException } from "@nestjs/common";
import { OwnerDto, OwnerRating, Paginated, PropertyStatus } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { ContactMaskingService } from "../../common/security/contact-masking.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import { ListOwnersQuery, UpsertOwnerDto } from "./dto";

interface OwnerStats {
  name: string;
  propertyCount: number;
  activeListings: number;
  soldCount: number;
  rentedCount: number;
}

@Injectable()
export class OwnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masking: ContactMaskingService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private async statsByPhone(): Promise<Map<string, OwnerStats>> {
    const properties = await this.db.property.findMany({
      select: { ownerName: true, ownerPhone: true, status: true },
    });
    const map = new Map<string, OwnerStats>();
    for (const p of properties) {
      const key = p.ownerPhone;
      if (!key) continue;
      const s = map.get(key) ?? {
        name: p.ownerName,
        propertyCount: 0,
        activeListings: 0,
        soldCount: 0,
        rentedCount: 0,
      };
      s.propertyCount += 1;
      if (p.status === PropertyStatus.ACTIVE_LISTING) s.activeListings += 1;
      if (p.status === PropertyStatus.SOLD) s.soldCount += 1;
      if (p.status === PropertyStatus.RENTED) s.rentedCount += 1;
      if (!s.name && p.ownerName) s.name = p.ownerName;
      map.set(key, s);
    }
    return map;
  }

  private toDto(args: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    whatsapp?: string | null;
    telegram?: string | null;
    address?: string | null;
    rating: OwnerRating;
    notes?: string | null;
    stats?: OwnerStats;
    createdAt?: Date;
    updatedAt?: Date;
  }): OwnerDto {
    const s = args.stats;
    return {
      id: args.id,
      name: args.name,
      phone: this.masking.phone(args.phone, {}),
      email: this.masking.email(args.email ?? null, {}),
      whatsapp: args.whatsapp ? this.masking.phone(args.whatsapp, {}) : null,
      telegram: args.telegram ?? null,
      address: args.address ?? null,
      rating: args.rating,
      notes: args.notes ?? null,
      propertyCount: s?.propertyCount ?? 0,
      activeListings: s?.activeListings ?? 0,
      soldCount: s?.soldCount ?? 0,
      rentedCount: s?.rentedCount ?? 0,
      createdAt: (args.createdAt ?? new Date()).toISOString(),
      updatedAt: (args.updatedAt ?? new Date()).toISOString(),
    };
  }

  async list(query: ListOwnersQuery): Promise<Paginated<OwnerDto>> {
    const [profiles, stats] = await Promise.all([
      this.db.ownerProfile.findMany(),
      this.statsByPhone(),
    ]);
    const profileByPhone = new Map(profiles.map((p) => [p.phone, p]));

    const merged: OwnerDto[] = [];
    const seen = new Set<string>();

    for (const p of profiles) {
      seen.add(p.phone);
      merged.push(
        this.toDto({
          id: p.id,
          name: p.name,
          phone: p.phone,
          email: p.email,
          whatsapp: p.whatsapp,
          telegram: p.telegram,
          address: p.address,
          rating: p.rating as OwnerRating,
          notes: p.notes,
          stats: stats.get(p.phone),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }),
      );
    }

    for (const [phone, s] of stats.entries()) {
      if (seen.has(phone) || profileByPhone.has(phone)) continue;
      merged.push(
        this.toDto({
          id: `phone:${phone}`,
          name: s.name || "Unknown owner",
          phone,
          rating: OwnerRating.AVERAGE,
          stats: s,
        }),
      );
    }

    let rows = merged;
    if (query.rating) rows = rows.filter((r) => r.rating === query.rating);
    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) || r.phone.includes(query.search!),
      );
    }
    rows.sort(
      (a, b) =>
        b.propertyCount - a.propertyCount || a.name.localeCompare(b.name),
    );

    const total = rows.length;
    const start = query.skip;
    return paginate(
      rows.slice(start, start + query.pageSize),
      total,
      query.page,
      query.pageSize,
    );
  }

  private async resolvePhone(idOrPhone: string): Promise<string> {
    if (idOrPhone.startsWith("phone:")) return idOrPhone.slice("phone:".length);
    const profile = await this.db.ownerProfile.findFirst({
      where: { id: idOrPhone },
      select: { phone: true },
    });
    if (!profile) throw new NotFoundException("Owner not found");
    return profile.phone;
  }

  async get(idOrPhone: string) {
    const phone = await this.resolvePhone(idOrPhone);
    const [profile, stats, properties] = await Promise.all([
      this.db.ownerProfile.findFirst({ where: { phone } }),
      this.statsByPhone(),
      this.db.property.findMany({
        where: { ownerPhone: phone },
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          price: true,
          region: true,
          ownerName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const s = stats.get(phone);
    const name =
      profile?.name ?? properties[0]?.ownerName ?? s?.name ?? "Unknown owner";

    const dto = this.toDto({
      id: profile?.id ?? `phone:${phone}`,
      name,
      phone,
      email: profile?.email,
      whatsapp: profile?.whatsapp,
      telegram: profile?.telegram,
      address: profile?.address,
      rating: (profile?.rating as OwnerRating) ?? OwnerRating.AVERAGE,
      notes: profile?.notes,
      stats: s,
      createdAt: profile?.createdAt,
      updatedAt: profile?.updatedAt,
    });

    return {
      ...dto,
      properties: properties.map((p) => ({
        id: p.id,
        reference: p.reference,
        title: p.title,
        status: p.status,
        price: Number(p.price),
        region: p.region,
        createdAt: p.createdAt.toISOString(),
      })),
      conversations: await this.conversations(phone),
    };
  }

  async conversations(ownerPhone: string) {
    const rows = await this.db.ownerConversation.findMany({
      where: { ownerPhone },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      message: r.message,
      actorName: r.actorName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async addConversation(dto: {
    ownerPhone: string;
    channel: string;
    message: string;
  }) {
    const { companyId, userId } = TenantStore.require();
    const actor = userId
      ? await this.prisma.user.findFirst({
          where: { id: userId },
          select: { fullName: true },
        })
      : null;
    return this.db.ownerConversation.create({
      data: {
        companyId: companyId!,
        ownerPhone: dto.ownerPhone,
        channel: dto.channel,
        message: dto.message,
        actorId: userId,
        actorName: actor?.fullName ?? null,
      },
    });
  }

  async upsert(dto: UpsertOwnerDto): Promise<OwnerDto> {
    const { companyId } = TenantStore.require();
    const existing = await this.db.ownerProfile.findFirst({
      where: { phone: dto.phone },
    });
    const data = {
      name: dto.name,
      email: dto.email,
      whatsapp: dto.whatsapp,
      telegram: dto.telegram,
      address: dto.address,
      rating: dto.rating ?? OwnerRating.AVERAGE,
      notes: dto.notes,
    };
    const profile = existing
      ? await this.db.ownerProfile.update({ where: { id: existing.id }, data })
      : await this.db.ownerProfile.create({
          data: { companyId: companyId!, phone: dto.phone, ...data },
        });

    const stats = await this.statsByPhone();
    return this.toDto({
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      whatsapp: profile.whatsapp,
      telegram: profile.telegram,
      address: profile.address,
      rating: profile.rating as OwnerRating,
      notes: profile.notes,
      stats: stats.get(profile.phone),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  }
}
