import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DomainEvent,
  LEAD_TRANSITIONS,
  LeadDetailDto,
  LeadDto,
  LeadStatus,
  NotificationType,
  Paginated,
  QueueName,
} from "@reos/shared";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { EventBus } from "../../../common/events/event-bus";
import { QueueService } from "../../../common/queue/queue.service";
import { ContactMaskingService } from "../../../common/security/contact-masking.service";
import { TenantStore } from "../../../common/tenant/tenant-context";
import { paginate } from "../../../common/http/pagination";
import { NotificationsService } from "../../notifications/notifications.service";
import { computeDedupHash, scoreLead } from "../domain/lead-scoring";
import {
  AssignLeadDto,
  CreateLeadDto,
  ListLeadsQuery,
  TransitionLeadDto,
  UpdateLeadDto,
} from "./dto";

type LeadRow = Awaited<ReturnType<PrismaService["lead"]["findFirst"]>> & {
  assignedTo?: { id: string; fullName: string } | null;
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly queue: QueueService,
    private readonly masking: ContactMaskingService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private ctx() {
    return TenantStore.require();
  }

  private toDto(lead: LeadRow): LeadDto {
    const hint = { assignedToId: lead!.assignedToId, branchId: lead!.branchId };
    return {
      id: lead!.id,
      kind: lead!.kind as LeadDto["kind"],
      fullName: lead!.fullName,
      phone: this.masking.phone(lead!.phone, hint),
      email: this.masking.email(lead!.email, hint),
      source: lead!.source as LeadDto["source"],
      status: lead!.status as LeadStatus,
      score: lead!.score,
      region: (lead!.region as LeadDto["region"]) ?? null,
      listingUrl: lead!.listingUrl ?? null,
      listingPhotoUrl: lead!.listingPhotoUrl ?? null,
      listingPrice:
        lead!.listingPrice != null ? Number(lead!.listingPrice) : null,
      listingRooms: lead!.listingRooms ?? null,
      lastCallAt: lead!.lastCallAt?.toISOString() ?? null,
      lastCallResult:
        (lead!.lastCallResult as LeadDto["lastCallResult"]) ?? null,
      lastNote: lead!.lastNote ?? null,
      ownerRating: (lead!.ownerRating as LeadDto["ownerRating"]) ?? null,
      assignedToId: lead!.assignedToId,
      assignedToName: lead?.assignedTo?.fullName ?? null,
      notes: lead!.notes,
      createdAt: lead!.createdAt.toISOString(),
      updatedAt: lead!.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateLeadDto): Promise<LeadDto> {
    const { companyId, branchId } = this.ctx();
    const score = scoreLead(dto);
    const dedupHash = computeDedupHash({ phone: dto.phone, email: dto.email });
    const raw = dto.rawPayload as Record<string, unknown> | undefined;

    const lead = await this.db.lead.create({
      data: {
        companyId: companyId!,
        kind: dto.kind,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        source: dto.source,
        region: dto.region,
        notes: dto.notes,
        listingUrl: dto.listingUrl ?? (raw?.listingUrl as string | undefined),
        listingPhotoUrl:
          dto.listingPhotoUrl ?? (raw?.photoUrl as string | undefined),
        listingPrice: dto.listingPrice ?? (raw?.price as number | undefined),
        listingRooms: dto.listingRooms ?? (raw?.rooms as string | undefined),
        score,
        dedupHash,
        rawPayload: dto.rawPayload as object | undefined,
        branchId,
        activities: {
          create: { companyId, type: "SYSTEM", message: "Lead created" },
        },
      },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });

    this.events.publish(DomainEvent.LEAD_CREATED, {
      companyId,
      branchId,
      leadId: lead.id,
      occurredAt: new Date().toISOString(),
    });
    await this.queue.enqueue(QueueName.DEDUP, "check", {
      companyId,
      leadId: lead.id,
      dedupHash,
    });
    await this.queue.enqueue(QueueName.SCORING, "score", {
      companyId,
      leadId: lead.id,
    });

    const managers = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        roles: { hasSome: ["COMPANY_OWNER", "BRANCH_MANAGER"] },
      },
      select: { id: true },
      take: 10,
    });
    for (const m of managers) {
      await this.notifications.notify({
        companyId,
        userId: m.id,
        type: NotificationType.NEW_LEAD,
        title: "New lead",
        body: `${lead.fullName} — ${lead.source}`,
        link: "/leads",
      });
    }

    return this.toDto(lead as LeadRow);
  }

  async ingest(
    dto: CreateLeadDto,
  ): Promise<{ id: string; duplicate: boolean }> {
    const { companyId } = this.ctx();
    const dedupHash = computeDedupHash({ phone: dto.phone, email: dto.email });
    const existing = await this.db.lead.findFirst({
      where: { companyId, dedupHash },
    });
    if (existing) return { id: existing.id, duplicate: true };
    const lead = await this.create(dto);
    return { id: lead.id, duplicate: false };
  }

  async list(query: ListLeadsQuery): Promise<Paginated<LeadDto>> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.kind) where.kind = query.kind;
    if (query.region) where.region = query.region;
    if (query.minScore != null) where.score = { gte: query.minScore };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.db.lead.findMany({
        where,
        include: { assignedTo: { select: { id: true, fullName: true } } },
        orderBy: query.orderBy("createdAt"),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.lead.count({ where }),
    ]);

    return paginate(
      rows.map((r) => this.toDto(r as LeadRow)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string): Promise<LeadDto> {
    const lead = await this.db.lead.findFirst({
      where: { id },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    return this.toDto(lead as LeadRow);
  }

  async getDetail(id: string): Promise<LeadDetailDto> {
    const lead = await this.db.lead.findFirst({
      where: { id },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    const [activities, calls] = await Promise.all([
      this.db.leadActivity.findMany({
        where: { leadId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.db.call.findMany({
        where: { leadId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return {
      ...this.toDto(lead as LeadRow),
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        fromValue: a.fromValue,
        toValue: a.toValue,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
      calls: calls.map((c) => ({
        id: c.id,
        result: c.result as LeadDetailDto["calls"][0]["result"],
        notes: c.notes,
        followUpAt: c.followUpAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async update(id: string, dto: UpdateLeadDto): Promise<LeadDto> {
    await this.ensureExists(id);
    const lead = await this.db.lead.update({
      where: { id },
      data: { ...dto },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });
    return this.toDto(lead as LeadRow);
  }

  async assign(id: string, dto: AssignLeadDto): Promise<LeadDto> {
    const { companyId, branchId } = this.ctx();
    await this.ensureExists(id);
    const agent = await this.db.user.findFirst({ where: { id: dto.agentId } });
    if (!agent) throw new BadRequestException("Agent not found in this tenant");

    const lead = await this.db.lead.update({
      where: { id },
      data: {
        assignedToId: dto.agentId,
        activities: {
          create: {
            companyId,
            type: "ASSIGNMENT",
            toValue: agent.fullName,
            message: `Assigned to ${agent.fullName}`,
          },
        },
      },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });

    this.events.publish(DomainEvent.LEAD_ASSIGNED, {
      companyId,
      branchId,
      leadId: id,
      agentId: dto.agentId,
      occurredAt: new Date().toISOString(),
    });
    this.events.publish(DomainEvent.ASSIGNMENT_CHANGED, {
      companyId,
      branchId,
      entity: "lead",
      entityId: id,
      assigneeId: dto.agentId,
      occurredAt: new Date().toISOString(),
    });
    return this.toDto(lead as LeadRow);
  }

  async transition(id: string, dto: TransitionLeadDto): Promise<LeadDto> {
    const { companyId, branchId } = this.ctx();
    const current = await this.db.lead.findFirst({ where: { id } });
    if (!current) throw new NotFoundException("Lead not found");

    const allowed = LEAD_TRANSITIONS[current.status as LeadStatus];
    if (!allowed.includes(dto.to)) {
      throw new BadRequestException(
        `Illegal transition ${current.status} → ${dto.to}`,
      );
    }

    const lead = await this.db.lead.update({
      where: { id },
      data: {
        status: dto.to,
        activities: {
          create: {
            companyId,
            type: "STATUS_CHANGE",
            fromValue: current.status,
            toValue: dto.to,
            message: dto.note,
          },
        },
      },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });

    this.events.publish(DomainEvent.LEAD_STATUS_CHANGED, {
      companyId,
      branchId,
      leadId: id,
      from: current.status,
      to: dto.to,
      occurredAt: new Date().toISOString(),
    });
    return this.toDto(lead as LeadRow);
  }

  async activities(id: string) {
    await this.ensureExists(id);
    return this.db.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async reveal(id: string) {
    const lead = await this.db.lead.findFirst({ where: { id } });
    if (!lead) throw new NotFoundException("Lead not found");
    const ok = await this.masking.reveal("lead", id, {
      assignedToId: lead.assignedToId,
      branchId: lead.branchId,
    });
    if (!ok) throw new ForbiddenException("Not allowed to reveal contact");
    return { phone: lead.phone, email: lead.email };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.db.lead.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Lead not found");
  }
}
