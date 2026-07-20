import { Injectable, NotFoundException } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  CommissionDto,
  CommissionStatus,
  DomainEvent,
  FinanceSummary,
  InvoiceDto,
  InvoiceStatus,
  NotificationType,
  Paginated,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ChangeCommissionStatusDto,
  ChangeInvoiceStatusDto,
  CreateCommissionDto,
  CreateInvoiceDto,
  ListCommissionsQuery,
  ListInvoicesQuery,
} from "./dto";

const DEFAULT_RATE = Number(process.env.COMMISSION_DEFAULT_RATE ?? "3");

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private async enrichCommissions(rows: any[]): Promise<CommissionDto[]> {
    const dealIds = [
      ...new Set(rows.map((r) => r.dealId).filter(Boolean)),
    ] as string[];
    const agentIds = [
      ...new Set(rows.map((r) => r.agentId).filter(Boolean)),
    ] as string[];
    const [deals, agents] = await Promise.all([
      dealIds.length
        ? this.db.deal.findMany({
            where: { id: { in: dealIds } },
            select: { id: true, title: true },
          })
        : [],
      agentIds.length
        ? this.db.user.findMany({
            where: { id: { in: agentIds } },
            select: { id: true, fullName: true },
          })
        : [],
    ]);
    const dMap = new Map(deals.map((d) => [d.id, d.title]));
    const aMap = new Map(agents.map((a) => [a.id, a.fullName]));
    return rows.map((c) => ({
      id: c.id,
      dealId: c.dealId,
      dealTitle: dMap.get(c.dealId) ?? null,
      agentId: c.agentId,
      agentName: c.agentId ? (aMap.get(c.agentId) ?? null) : null,
      baseAmount: Number(c.baseAmount),
      ratePct: Number(c.ratePct),
      amount: Number(c.amount),
      currency: c.currency,
      status: c.status,
      note: c.note,
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createCommission(dto: CreateCommissionDto): Promise<CommissionDto> {
    const { companyId } = TenantStore.require();
    const amount = Math.round(dto.baseAmount * (dto.ratePct / 100) * 100) / 100;
    const c = await this.db.commission.create({
      data: {
        companyId: companyId!,
        dealId: dto.dealId,
        agentId: dto.agentId,
        baseAmount: dto.baseAmount,
        ratePct: dto.ratePct,
        amount,
        note: dto.note,
      },
    });
    const [out] = await this.enrichCommissions([c]);
    return out;
  }

  async listCommissions(
    query: ListCommissionsQuery,
  ): Promise<Paginated<CommissionDto>> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.dealId) where.dealId = query.dealId;
    const [rows, total] = await Promise.all([
      this.db.commission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.commission.count({ where }),
    ]);
    return paginate(
      await this.enrichCommissions(rows),
      total,
      query.page,
      query.pageSize,
    );
  }

  async changeCommissionStatus(
    id: string,
    dto: ChangeCommissionStatusDto,
  ): Promise<CommissionDto> {
    const exists = await this.db.commission.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Commission not found");
    const paid = dto.status === CommissionStatus.PAID;
    const c = await this.db.commission.update({
      where: { id },
      data: {
        status: dto.status as never,
        ...(paid ? { paidAt: new Date() } : {}),
      },
    });
    const [out] = await this.enrichCommissions([c]);
    return out;
  }

  private toInvoiceDto(i: any): InvoiceDto {
    return {
      id: i.id,
      number: i.number,
      customerId: i.customerId,
      dealId: i.dealId,
      amount: Number(i.amount),
      currency: i.currency,
      status: i.status,
      issuedAt: i.issuedAt ? i.issuedAt.toISOString() : null,
      dueAt: i.dueAt ? i.dueAt.toISOString() : null,
      paidAt: i.paidAt ? i.paidAt.toISOString() : null,
      notes: i.notes,
      createdAt: i.createdAt.toISOString(),
    };
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceDto> {
    const { companyId } = TenantStore.require();
    const number =
      dto.number ??
      `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const i = await this.db.invoice.create({
      data: {
        companyId: companyId!,
        number,
        customerId: dto.customerId,
        dealId: dto.dealId,
        amount: dto.amount,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        notes: dto.notes,
        issuedAt: new Date(),
        status: InvoiceStatus.SENT as never,
      },
    });
    return this.toInvoiceDto(i);
  }

  async listInvoices(query: ListInvoicesQuery): Promise<Paginated<InvoiceDto>> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    const [rows, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.invoice.count({ where }),
    ]);
    return paginate(
      rows.map((r) => this.toInvoiceDto(r)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async changeInvoiceStatus(
    id: string,
    dto: ChangeInvoiceStatusDto,
  ): Promise<InvoiceDto> {
    const exists = await this.db.invoice.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Invoice not found");
    const paid = dto.status === InvoiceStatus.PAID;
    const i = await this.db.invoice.update({
      where: { id },
      data: {
        status: dto.status as never,
        ...(paid ? { paidAt: new Date() } : {}),
      },
    });
    return this.toInvoiceDto(i);
  }

  async summary(): Promise<FinanceSummary> {
    const [commPending, commPaid, invOutstanding, invPaid] = await Promise.all([
      this.db.commission.aggregate({
        _sum: { amount: true },
        where: {
          status: {
            in: [CommissionStatus.PENDING, CommissionStatus.INVOICED] as never,
          },
        },
      }),
      this.db.commission.aggregate({
        _sum: { amount: true },
        where: { status: CommissionStatus.PAID as never },
      }),
      this.db.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: {
            in: [
              InvoiceStatus.SENT,
              InvoiceStatus.OVERDUE,
              InvoiceStatus.DRAFT,
            ] as never,
          },
        },
      }),
      this.db.invoice.aggregate({
        _sum: { amount: true },
        where: { status: InvoiceStatus.PAID as never },
      }),
    ]);
    return {
      commissionPending: Number(commPending._sum?.amount ?? 0),
      commissionPaid: Number(commPaid._sum?.amount ?? 0),
      invoiceOutstanding: Number(invOutstanding._sum?.amount ?? 0),
      invoicePaid: Number(invPaid._sum?.amount ?? 0),
      currency: "EUR",
    };
  }

  @OnEvent(DomainEvent.DEAL_CLOSED)
  async onDealClosed(payload: {
    companyId: string;
    dealId: string;
    value: number;
  }): Promise<void> {
    if (!payload?.companyId || !payload.dealId) return;
    // Avoid duplicates if the event fires more than once.
    const existing = await this.prisma.commission.findFirst({
      where: {
        companyId: payload.companyId,
        dealId: payload.dealId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) return;

    const deal = await this.prisma.deal.findFirst({
      where: { id: payload.dealId, companyId: payload.companyId },
      select: { id: true, ownerId: true, value: true },
    });
    if (!deal) return;

    const base = Number(deal.value ?? payload.value ?? 0);
    const amount = Math.round(base * (DEFAULT_RATE / 100) * 100) / 100;
    const commission = await this.prisma.commission.create({
      data: {
        companyId: payload.companyId,
        dealId: deal.id,
        agentId: deal.ownerId,
        baseAmount: base,
        ratePct: DEFAULT_RATE,
        amount,
        note: "Created on deal close",
      },
    });
    this.events.publish(DomainEvent.COMMISSION_CREATED, {
      companyId: payload.companyId,
      commissionId: commission.id,
      dealId: deal.id,
      occurredAt: new Date().toISOString(),
    });
    if (deal.ownerId) {
      await this.notifications.notify({
        companyId: payload.companyId,
        userId: deal.ownerId,
        type: NotificationType.DEAL,
        title: "Commission created",
        body: `For closed deal: ${amount} EUR commission (${DEFAULT_RATE}%).`,
        link: "/finance",
      });
    }
  }
}
