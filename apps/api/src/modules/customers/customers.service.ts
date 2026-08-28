import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CustomerDetailDto,
  CustomerDto,
  DomainEvent,
  NotificationType,
  Paginated,
  QueueName,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { QueueService } from "../../common/queue/queue.service";
import { ContactMaskingService } from "../../common/security/contact-masking.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import {
  CreateCustomerDto,
  ListCustomersQuery,
  UpdateCustomerDto,
} from "./dto";

@Injectable()
export class CustomersService {
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

  private toDto(c: any): CustomerDto {
    const hint = { assignedToId: c.assignedToId, branchId: c.branchId };
    return {
      id: c.id,
      fullName: c.fullName,
      phone: this.masking.phone(c.phone, hint),
      email: this.masking.email(c.email, hint),
      whatsapp: c.whatsapp ? this.masking.phone(c.whatsapp, hint) : null,
      viberId: c.viberId ?? null,
      kind: c.kind,
      intent: c.intent,
      segment: c.segment,
      budgetMin: Number(c.budgetMin),
      budgetMax: Number(c.budgetMax),
      preferredRegions: c.preferredRegions,
      propertyType: c.propertyType,
      roomRequirement: c.roomRequirement,
      financing: c.financing ?? null,
      residency: c.residency ?? null,
      preferredPurpose: c.preferredPurpose ?? null,
      moveInDate: c.moveInDate?.toISOString() ?? null,
      leaseMonths: c.leaseMonths ?? null,
      petsAllowed: c.petsAllowed ?? null,
      occupants: c.occupants ?? null,
      assignedToId: c.assignedToId,
      assignedToName: c.assignedTo?.fullName ?? null,
      lastContactAt: c.lastContactAt?.toISOString() ?? null,
      notes: c.notes ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async create(dto: CreateCustomerDto): Promise<CustomerDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const customer = await this.db.customer.create({
      data: {
        companyId: companyId!,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        whatsapp: dto.whatsapp,
        viberId: dto.viberId,
        kind: dto.kind,
        intent: dto.intent,
        segment: dto.segment ?? "WARM",
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        preferredRegions: dto.preferredRegions,
        propertyType: dto.propertyType,
        roomRequirement: dto.roomRequirement,
        financing: dto.financing,
        residency: dto.residency,
        preferredPurpose:
          dto.preferredPurpose ??
          (dto.kind === "TENANT"
            ? "RENT"
            : dto.kind === "BUYER"
              ? "SALE"
              : undefined),
        moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : undefined,
        leaseMonths: dto.leaseMonths,
        petsAllowed: dto.petsAllowed,
        occupants: dto.occupants,
        notes: dto.notes,
        assignedToId: userId,
        branchId,
      },
    });
    this.events.publish(DomainEvent.CUSTOMER_CREATED, {
      companyId,
      branchId,
      customerId: customer.id,
      occurredAt: new Date().toISOString(),
    });
    await this.queue.enqueue(QueueName.MATCHING, "customer", {
      companyId,
      customerId: customer.id,
    });

    const managers = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        roles: { hasSome: ["COMPANY_OWNER", "BRANCH_MANAGER", "SALES_AGENT"] },
      },
      select: { id: true },
      take: 10,
    });
    for (const m of managers) {
      await this.notifications.notify({
        companyId,
        userId: m.id,
        type: NotificationType.NEW_CUSTOMER,
        title: "New customer",
        body: customer.fullName,
        link: `/customers/${customer.id}`,
      });
    }

    return this.toDto(customer);
  }

  async list(query: ListCustomersQuery): Promise<Paginated<CustomerDto>> {
    const where: Record<string, unknown> = {};
    if (query.segment) where.segment = query.segment;
    if (query.kind) where.kind = query.kind;
    if (query.intent) where.intent = query.intent;
    if (query.region) where.preferredRegions = { has: query.region };
    if (query.minBudget != null) where.budgetMax = { gte: query.minBudget };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        include: { assignedTo: { select: { fullName: true } } },
        orderBy: query.orderBy("createdAt"),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.customer.count({ where }),
    ]);
    return paginate(
      rows.map((r) => this.toDto(r)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string): Promise<CustomerDto> {
    const c = await this.db.customer.findFirst({
      where: { id },
      include: { assignedTo: { select: { fullName: true } } },
    });
    if (!c) throw new NotFoundException("Customer not found");
    return this.toDto(c);
  }

  async getDetail(id: string): Promise<CustomerDetailDto> {
    const c = await this.db.customer.findFirst({
      where: { id },
      include: { assignedTo: { select: { fullName: true } } },
    });
    if (!c) throw new NotFoundException("Customer not found");

    const [matches, deliveries, appointments] = await Promise.all([
      this.db.match.findMany({
        where: { customerId: id },
        orderBy: { score: "desc" },
        take: 20,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              price: true,
              region: true,
              status: true,
              reference: true,
            },
          },
        },
      }),
      this.db.messageDelivery.findMany({
        where: { recipientId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { campaign: { select: { name: true } } },
      }),
      this.db.appointment.findMany({
        where: { customerId: id },
        orderBy: { startAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      ...this.toDto(c),
      matchCount: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        propertyId: m.propertyId,
        customerId: m.customerId,
        score: m.score,
        reasons: m.reasons,
        propertyTitle: m.property.title,
        propertyPrice: Number(m.property.price),
        propertyRegion: m.property.region,
        createdAt: m.createdAt.toISOString(),
      })),
      sentDeliveries: deliveries.map((d) => ({
        id: d.id,
        channel: d.channel as CustomerDetailDto["sentDeliveries"][0]["channel"],
        body: d.body ?? d.campaign?.name ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        title: a.title,
        startAt: a.startAt.toISOString(),
        endAt: (a.endAt ?? a.startAt).toISOString(),
        status: a.status as CustomerDetailDto["appointments"][0]["status"],
        location: a.location,
        notes: a.notes,
        customerId: a.customerId,
        propertyId: a.propertyId,
        agentId: a.agentId,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    const exists = await this.db.customer.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Customer not found");
    const c = await this.db.customer.update({
      where: { id },
      data: { ...dto, lastContactAt: new Date() },
    });
    await this.queue.enqueue(QueueName.MATCHING, "customer", {
      companyId: TenantStore.companyId(),
      customerId: id,
    });
    return this.toDto(c);
  }
}
