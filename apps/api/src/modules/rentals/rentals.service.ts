import {
  AvailabilityKind,
  LeaseStatus,
  ListingPurpose,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  PayoutStatus,
  RentalOverview,
  RentalPipelineStage,
  RentPaymentStatus,
} from "@reos/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate, PaginationQuery } from "../../common/http/pagination";
import {
  CreateAvailabilityDto,
  CreateHandoverDto,
  CreateLeaseDto,
  CreateMaintenanceDto,
  CreatePayoutDto,
  RecordPaymentDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
} from "./dto";
import { AutomationEvent } from "../automation/automation.events";

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  async overview(): Promise<RentalOverview> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const [
      activeLeases,
      pendingApplications,
      overduePayments,
      expiringLeases,
      openMaintenance,
      activeRentals,
      monthlyRentCollected,
      pendingPayouts,
    ] = await Promise.all([
      this.db.lease.count({ where: { status: LeaseStatus.ACTIVE } }),
      this.db.lease.count({
        where: {
          status: { in: [LeaseStatus.APPLICATION, LeaseStatus.APPROVED] },
        },
      }),
      this.db.rentPayment.count({
        where: {
          status: {
            in: [RentPaymentStatus.OVERDUE, RentPaymentStatus.PENDING],
          },
          dueDate: { lt: now },
        },
      }),
      this.db.lease.count({
        where: {
          status: LeaseStatus.ACTIVE,
          endDate: { lte: in30Days, gte: now },
        },
      }),
      this.db.maintenanceRequest.count({
        where: {
          status: {
            in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS],
          },
        },
      }),
      this.db.property.count({
        where: { purpose: ListingPurpose.RENT, status: "RENTED" },
      }),
      this.db.rentPayment.aggregate({
        where: { status: RentPaymentStatus.PAID, paidAt: { gte: monthStart } },
        _sum: { paidAmount: true },
      }),
      this.db.ownerPayout.count({ where: { status: PayoutStatus.PENDING } }),
    ]);

    return {
      activeLeases,
      pendingApplications,
      overduePayments,
      expiringLeases,
      openMaintenance,
      occupiedRentals: activeRentals,
      monthlyRentCollected: Number(monthlyRentCollected._sum.paidAmount ?? 0),
      pendingPayouts,
    };
  }

  async listLeases(
    query: PaginationQuery & { status?: LeaseStatus; propertyId?: string },
  ) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.propertyId) where.propertyId = query.propertyId;
    const [rows, total] = await Promise.all([
      this.db.lease.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              reference: true,
              ownerName: true,
              ownerPhone: true,
            },
          },
          customer: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.lease.count({ where }),
    ]);
    return paginate(
      rows.map((l) => this.leaseDto(l)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async createLease(dto: CreateLeaseDto) {
    const { companyId, branchId, userId } = TenantStore.require();
    const property = await this.db.property.findFirst({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");
    if (property.purpose !== ListingPurpose.RENT) {
      throw new BadRequestException("Property must be a rental listing");
    }

    const lease = await this.db.lease.create({
      data: {
        companyId: companyId!,
        branchId,
        propertyId: dto.propertyId,
        customerId: dto.customerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        monthlyRent: dto.monthlyRent ?? Number(property.price),
        depositAmount: dto.depositAmount ?? Number(property.depositAmount ?? 0),
        managementFeePct: dto.managementFeePct ?? property.managementFeePct,
        rentDueDay: dto.rentDueDay ?? 1,
        notes: dto.notes,
        agentId: userId,
        status: LeaseStatus.APPLICATION,
        pipelineStage: RentalPipelineStage.APPLICATION,
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            reference: true,
            ownerName: true,
            ownerPhone: true,
          },
        },
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    });
    return this.leaseDto(lease);
  }

  async updateLease(id: string, dto: UpdateLeaseDto) {
    const lease = await this.db.lease.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.pipelineStage !== undefined
          ? { pipelineStage: dto.pipelineStage }
          : {}),
        ...(dto.startDate !== undefined
          ? { startDate: new Date(dto.startDate) }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: new Date(dto.endDate) }
          : {}),
        ...(dto.monthlyRent !== undefined
          ? { monthlyRent: dto.monthlyRent }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.signedAt !== undefined
          ? { signedAt: dto.signedAt ? new Date(dto.signedAt) : null }
          : {}),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            reference: true,
            ownerName: true,
            ownerPhone: true,
          },
        },
        customer: { select: { id: true, fullName: true, phone: true } },
      },
    });
    return this.leaseDto(lease);
  }

  async activateLease(id: string) {
    const { companyId, branchId, userId } = TenantStore.require();
    const lease = await this.db.lease.findFirst({
      where: { id },
      include: { property: true },
    });
    if (!lease) throw new NotFoundException("Lease not found");

    await this.db.lease.update({
      where: { id },
      data: {
        status: LeaseStatus.ACTIVE,
        pipelineStage: RentalPipelineStage.ACTIVE,
        moveInAt: new Date(),
        signedAt: lease.signedAt ?? new Date(),
      },
    });

    await this.db.property.update({
      where: { id: lease.propertyId },
      data: { status: "RENTED" },
    });

    await this.generateRentSchedule(
      id,
      lease.propertyId,
      companyId!,
      new Date(lease.startDate),
      new Date(lease.endDate),
      Number(lease.monthlyRent),
      lease.rentDueDay,
    );

    await this.db.availabilityBlock.create({
      data: {
        companyId: companyId!,
        propertyId: lease.propertyId,
        startDate: lease.startDate,
        endDate: lease.endDate,
        kind: AvailabilityKind.LEASE,
        source: "LEASE",
        notes: `Lease ${id}`,
      },
    });

    this.events.emit(AutomationEvent.LEASE_ACTIVATED, {
      companyId: companyId!,
      branchId,
      leaseId: id,
      propertyId: lease.propertyId,
      agentId: userId,
    });

    return this.getLease(id);
  }

  async terminateLease(id: string, notes?: string) {
    const lease = await this.db.lease.findFirst({
      where: { id },
      include: { property: true },
    });
    if (!lease) throw new NotFoundException("Lease not found");

    await this.db.lease.update({
      where: { id },
      data: {
        status: LeaseStatus.TERMINATED,
        pipelineStage: RentalPipelineStage.VACATED,
        moveOutAt: new Date(),
        notes: notes ?? lease.notes,
      },
    });

    await this.db.property.update({
      where: { id: lease.propertyId },
      data: { status: "ACTIVE_LISTING", purpose: ListingPurpose.RENT },
    });

    return this.getLease(id);
  }

  async getLease(id: string) {
    const lease = await this.db.lease.findFirst({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            reference: true,
            ownerName: true,
            ownerPhone: true,
            address: true,
          },
        },
        customer: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
        payments: { orderBy: { dueDate: "asc" } },
        handovers: { orderBy: { completedAt: "desc" } },
      },
    });
    if (!lease) throw new NotFoundException("Lease not found");
    return {
      ...this.leaseDto(lease),
      payments: lease.payments.map((p) => this.paymentDto(p)),
      handovers: lease.handovers,
    };
  }

  private async generateRentSchedule(
    leaseId: string,
    propertyId: string,
    companyId: string,
    start: Date,
    end: Date,
    monthlyRent: number,
    dueDay: number,
  ) {
    const payments: Array<{
      companyId: string;
      leaseId: string;
      propertyId: string;
      dueDate: Date;
      amount: number;
    }> = [];
    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      Math.min(dueDay, 28),
    );
    while (cursor <= end) {
      if (cursor >= start) {
        payments.push({
          companyId,
          leaseId,
          propertyId,
          dueDate: new Date(cursor),
          amount: monthlyRent,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (payments.length) {
      await this.prisma.rentPayment.createMany({ data: payments });
    }
  }

  async listPayments(
    query: PaginationQuery & { status?: RentPaymentStatus; leaseId?: string },
  ) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.leaseId) where.leaseId = query.leaseId;
    const [rows, total] = await Promise.all([
      this.db.rentPayment.findMany({
        where,
        include: {
          property: { select: { title: true, reference: true } },
          lease: { include: { customer: { select: { fullName: true } } } },
        },
        orderBy: { dueDate: "desc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.rentPayment.count({ where }),
    ]);
    return paginate(
      rows.map((p) => ({
        ...this.paymentDto(p),
        propertyTitle: p.property.title,
        tenantName: p.lease.customer.fullName,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async recordPayment(id: string, dto: RecordPaymentDto) {
    const payment = await this.db.rentPayment.findFirst({ where: { id } });
    if (!payment) throw new NotFoundException("Payment not found");
    const paidAmount = dto.paidAmount ?? Number(payment.amount);
    const status =
      paidAmount >= Number(payment.amount)
        ? RentPaymentStatus.PAID
        : paidAmount > 0
          ? RentPaymentStatus.PARTIAL
          : (payment.status as RentPaymentStatus);

    const updated = await this.db.rentPayment.update({
      where: { id },
      data: {
        paidAmount,
        status,
        paidAt: new Date(),
        method: dto.method ?? PaymentMethod.BANK_TRANSFER,
        notes: dto.notes,
      },
    });
    return this.paymentDto(updated);
  }

  async markOverduePayments() {
    const now = new Date();
    await this.db.rentPayment.updateMany({
      where: { status: RentPaymentStatus.PENDING, dueDate: { lt: now } },
      data: { status: RentPaymentStatus.OVERDUE },
    });
  }

  async listPayouts(query: PaginationQuery) {
    const [rows, total] = await Promise.all([
      this.db.ownerPayout.findMany({
        orderBy: { periodStart: "desc" },
        include: { property: { select: { title: true, reference: true } } },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.ownerPayout.count(),
    ]);
    return paginate(
      rows.map((p) => ({
        id: p.id,
        propertyId: p.propertyId,
        propertyTitle: p.property.title,
        ownerPhone: p.ownerPhone,
        ownerName: p.ownerName,
        periodStart: p.periodStart.toISOString(),
        periodEnd: p.periodEnd.toISOString(),
        grossRent: Number(p.grossRent),
        managementFee: Number(p.managementFee),
        expenses: Number(p.expenses),
        netAmount: Number(p.netAmount),
        status: p.status as PayoutStatus,
        paidAt: p.paidAt?.toISOString() ?? null,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async createPayout(dto: CreatePayoutDto) {
    const { companyId } = TenantStore.require();
    const property = await this.db.property.findFirst({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const paid = await this.db.rentPayment.aggregate({
      where: {
        propertyId: dto.propertyId,
        status: RentPaymentStatus.PAID,
        paidAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { paidAmount: true },
    });
    const grossRent = dto.grossRent ?? Number(paid._sum.paidAmount ?? 0);
    const feePct = dto.managementFeePct ?? property.managementFeePct ?? 10;
    const managementFee =
      dto.managementFee ?? Math.round(grossRent * (feePct / 100) * 100) / 100;
    const expenses = dto.expenses ?? 0;
    const netAmount = grossRent - managementFee - expenses;

    return this.db.ownerPayout.create({
      data: {
        companyId: companyId!,
        propertyId: dto.propertyId,
        ownerPhone: property.ownerPhone,
        ownerName: property.ownerName,
        periodStart,
        periodEnd,
        grossRent,
        managementFee,
        expenses,
        netAmount,
        notes: dto.notes,
      },
    });
  }

  async markPayoutPaid(id: string) {
    return this.db.ownerPayout.update({
      where: { id },
      data: { status: PayoutStatus.PAID, paidAt: new Date() },
    });
  }

  async listMaintenance(
    query: PaginationQuery & {
      status?: MaintenanceStatus;
      propertyId?: string;
    },
  ) {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.propertyId) where.propertyId = query.propertyId;
    const [rows, total] = await Promise.all([
      this.db.maintenanceRequest.findMany({
        where,
        include: { property: { select: { title: true, reference: true } } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.maintenanceRequest.count({ where }),
    ]);
    return paginate(
      rows.map((m) => this.maintenanceDto(m)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async createMaintenance(dto: CreateMaintenanceDto) {
    const { companyId, branchId } = TenantStore.require();
    const m = await this.db.maintenanceRequest.create({
      data: {
        companyId: companyId!,
        propertyId: dto.propertyId,
        leaseId: dto.leaseId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? MaintenancePriority.MEDIUM,
        reportedBy: dto.reportedBy,
        assignedToId: dto.assignedToId,
      },
      include: { property: { select: { title: true, reference: true } } },
    });
    this.events.emit(AutomationEvent.MAINTENANCE_CREATED, {
      companyId: companyId!,
      branchId,
      maintenanceId: m.id,
      propertyId: m.propertyId,
      title: m.title,
      priority: m.priority,
      assignedToId: m.assignedToId,
    });
    return this.maintenanceDto(m);
  }

  async updateMaintenance(id: string, dto: UpdateMaintenanceDto) {
    const m = await this.db.maintenanceRequest.update({
      where: { id },
      data: {
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              ...(dto.status === MaintenanceStatus.COMPLETED
                ? { completedAt: new Date() }
                : {}),
            }
          : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      include: { property: { select: { title: true, reference: true } } },
    });
    return this.maintenanceDto(m);
  }

  async createHandover(dto: CreateHandoverDto) {
    const { companyId, userId, branchId } = TenantStore.require();
    const lease = await this.db.lease.findFirst({ where: { id: dto.leaseId } });
    if (!lease) throw new NotFoundException("Lease not found");
    const actor = userId
      ? await this.prisma.user.findFirst({
          where: { id: userId },
          select: { fullName: true },
        })
      : null;

    const record = await this.db.handoverRecord.create({
      data: {
        companyId: companyId!,
        leaseId: dto.leaseId,
        propertyId: lease.propertyId,
        type: dto.type,
        checklist: dto.checklist as object | undefined,
        keysGiven: dto.keysGiven,
        notes: dto.notes,
        actorId: userId,
        actorName: actor?.fullName,
      },
    });

    this.events.emit(AutomationEvent.HANDOVER_CREATED, {
      companyId: companyId!,
      branchId,
      leaseId: dto.leaseId,
      propertyId: lease.propertyId,
      type: dto.type,
      agentId: userId,
    });

    return record;
  }

  async listHandovers(leaseId: string) {
    return this.db.handoverRecord.findMany({
      where: { leaseId },
      orderBy: { completedAt: "desc" },
    });
  }

  async listAvailability(propertyId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { propertyId };
    if (from || to) {
      where.AND = [
        ...(to ? [{ startDate: { lte: new Date(to) } }] : []),
        ...(from ? [{ endDate: { gte: new Date(from) } }] : []),
      ];
    }
    return this.db.availabilityBlock.findMany({
      where,
      orderBy: { startDate: "asc" },
    });
  }

  async createAvailability(dto: CreateAvailabilityDto) {
    const { companyId } = TenantStore.require();
    return this.db.availabilityBlock.create({
      data: {
        companyId: companyId!,
        propertyId: dto.propertyId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        kind: dto.kind ?? AvailabilityKind.BOOKED,
        source: dto.source ?? "MANUAL",
        externalRef: dto.externalRef,
        notes: dto.notes,
      },
    });
  }

  async deleteAvailability(id: string) {
    await this.db.availabilityBlock.delete({ where: { id } });
    return { deleted: true };
  }

  private leaseDto(l: any) {
    return {
      id: l.id,
      propertyId: l.propertyId,
      customerId: l.customerId,
      propertyTitle: l.property?.title ?? null,
      propertyReference: l.property?.reference ?? null,
      ownerName: l.property?.ownerName ?? null,
      ownerPhone: l.property?.ownerPhone ?? null,
      tenantName: l.customer?.fullName ?? null,
      tenantPhone: l.customer?.phone ?? null,
      status: l.status,
      pipelineStage: l.pipelineStage,
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      monthlyRent: Number(l.monthlyRent),
      depositAmount: Number(l.depositAmount),
      depositStatus: l.depositStatus,
      managementFeePct: l.managementFeePct,
      rentDueDay: l.rentDueDay,
      notes: l.notes,
      signedAt: l.signedAt?.toISOString() ?? null,
      moveInAt: l.moveInAt?.toISOString() ?? null,
      moveOutAt: l.moveOutAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
    };
  }

  private paymentDto(p: any) {
    return {
      id: p.id,
      leaseId: p.leaseId,
      propertyId: p.propertyId,
      dueDate: p.dueDate.toISOString(),
      amount: Number(p.amount),
      paidAmount: Number(p.paidAmount),
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      method: p.method,
      notes: p.notes,
    };
  }

  private maintenanceDto(m: any) {
    return {
      id: m.id,
      propertyId: m.propertyId,
      propertyTitle: m.property?.title ?? null,
      leaseId: m.leaseId,
      title: m.title,
      description: m.description,
      status: m.status,
      priority: m.priority,
      reportedBy: m.reportedBy,
      assignedToId: m.assignedToId,
      completedAt: m.completedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
