import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AppointmentDto,
  DomainEvent,
  NotificationType,
  Paginated,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ChangeAppointmentStatusDto,
  CreateAppointmentDto,
  ListAppointmentsQuery,
  UpdateAppointmentDto,
} from "./dto";

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private async enrich(rows: any[]): Promise<AppointmentDto[]> {
    const propertyIds = [
      ...new Set(rows.map((r) => r.propertyId).filter(Boolean)),
    ] as string[];
    const customerIds = [
      ...new Set(rows.map((r) => r.customerId).filter(Boolean)),
    ] as string[];
    const agentIds = [
      ...new Set(rows.map((r) => r.agentId).filter(Boolean)),
    ] as string[];

    const [properties, customers, agents] = await Promise.all([
      propertyIds.length
        ? this.db.property.findMany({
            where: { id: { in: propertyIds } },
            select: { id: true, title: true },
          })
        : [],
      customerIds.length
        ? this.db.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, fullName: true },
          })
        : [],
      agentIds.length
        ? this.db.user.findMany({
            where: { id: { in: agentIds } },
            select: { id: true, fullName: true },
          })
        : [],
    ]);
    const pMap = new Map(properties.map((p) => [p.id, p.title]));
    const cMap = new Map(customers.map((c) => [c.id, c.fullName]));
    const aMap = new Map(agents.map((a) => [a.id, a.fullName]));

    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt ? a.endAt.toISOString() : null,
      location: a.location,
      notes: a.notes,
      propertyId: a.propertyId,
      customerId: a.customerId,
      leadId: a.leadId,
      agentId: a.agentId,
      propertyTitle: a.propertyId ? (pMap.get(a.propertyId) ?? null) : null,
      customerName: a.customerId ? (cMap.get(a.customerId) ?? null) : null,
      agentName: a.agentId ? (aMap.get(a.agentId) ?? null) : null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async create(dto: CreateAppointmentDto): Promise<AppointmentDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const agentId = dto.agentId ?? userId ?? undefined;

    const appt = await this.db.appointment.create({
      data: {
        companyId: companyId!,
        branchId,
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        location: dto.location,
        notes: dto.notes,
        propertyId: dto.propertyId,
        customerId: dto.customerId,
        leadId: dto.leadId,
        agentId,
      },
    });

    // Auto-create a reminder task for the agent so it surfaces on the board.
    await this.db.task.create({
      data: {
        companyId: companyId!,
        branchId,
        title: `Appointment: ${dto.title}`,
        description: dto.location ? `Konum: ${dto.location}` : undefined,
        type: "FOLLOW_UP" as never,
        priority: "HIGH" as never,
        assigneeId: agentId,
        dueAt: new Date(dto.startAt),
        relatedEntity: "appointment",
        relatedEntityId: appt.id,
      },
    });

    this.events.publish(DomainEvent.APPOINTMENT_CREATED, {
      companyId: companyId!,
      branchId,
      appointmentId: appt.id,
      agentId,
      occurredAt: new Date().toISOString(),
    });

    if (agentId && agentId !== userId) {
      await this.notifications.notify({
        companyId: companyId!,
        userId: agentId,
        type: NotificationType.APPOINTMENT,
        title: "New appointment assigned",
        body: `${dto.title} — ${new Date(dto.startAt).toLocaleString()}`,
        link: "/appointments",
      });
    }

    const [dtoOut] = await this.enrich([appt]);
    return dtoOut;
  }

  async list(query: ListAppointmentsQuery): Promise<Paginated<AppointmentDto>> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.from || query.to) {
      where.startAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        orderBy: { startAt: "asc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.appointment.count({ where }),
    ]);
    return paginate(await this.enrich(rows), total, query.page, query.pageSize);
  }

  async get(id: string): Promise<AppointmentDto> {
    const appt = await this.db.appointment.findFirst({ where: { id } });
    if (!appt) throw new NotFoundException("Appointment not found");
    const [dto] = await this.enrich([appt]);
    return dto;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDto> {
    await this.ensureExists(id);
    const appt = await this.db.appointment.update({
      where: { id },
      data: {
        ...(dto.title != null ? { title: dto.title } : {}),
        ...(dto.startAt != null ? { startAt: new Date(dto.startAt) } : {}),
        ...(dto.endAt != null ? { endAt: new Date(dto.endAt) } : {}),
        ...(dto.location != null ? { location: dto.location } : {}),
        ...(dto.notes != null ? { notes: dto.notes } : {}),
        ...(dto.agentId != null ? { agentId: dto.agentId } : {}),
      },
    });
    const [out] = await this.enrich([appt]);
    return out;
  }

  async changeStatus(
    id: string,
    dto: ChangeAppointmentStatusDto,
  ): Promise<AppointmentDto> {
    const { companyId, branchId } = TenantStore.require();
    const current = await this.db.appointment.findFirst({ where: { id } });
    if (!current) throw new NotFoundException("Appointment not found");
    const appt = await this.db.appointment.update({
      where: { id },
      data: { status: dto.status },
    });
    this.events.publish(DomainEvent.APPOINTMENT_STATUS_CHANGED, {
      companyId: companyId!,
      branchId,
      appointmentId: id,
      from: current.status,
      to: dto.status,
      occurredAt: new Date().toISOString(),
    });
    const [out] = await this.enrich([appt]);
    return out;
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.ensureExists(id);
    await this.db.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.db.appointment.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Appointment not found");
  }
}
