import { Injectable } from "@nestjs/common";
import {
  AgentPerformance,
  DashboardAlarm,
  DashboardData,
  LeadStatus,
  ListingPurpose,
  OverviewKpis,
  PropertyStatus,
  RecentListing,
  Region,
  RegionPerformance,
  ReportRange,
  ReportSummary,
  TaskDto,
  TaskStatus,
  TopPerformer,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  async overview(): Promise<OverviewKpis> {
    const today = startOfDay();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const now = new Date();

    const [
      dailyLeads,
      callsMade,
      totalLeads,
      convertedLeads,
      activeListings,
      closedDeals,
      revenueAgg,
      forSale,
      forRent,
      newListingsThisWeek,
      callbacksPending,
      appointmentsToday,
      soldThisMonth,
      rentedThisMonth,
      commissionAgg,
    ] = await Promise.all([
      this.db.lead.count({ where: { createdAt: { gte: today } } }),
      this.db.call.count({ where: { createdAt: { gte: today } } }),
      this.db.lead.count(),
      this.db.lead.count({
        where: { status: { in: [LeadStatus.IN_PORTFOLIO, LeadStatus.AGREED] } },
      }),
      this.db.property.count({
        where: { status: PropertyStatus.ACTIVE_LISTING },
      }),
      this.db.deal.count({ where: { stage: "DEAL_CLOSED" } }),
      this.db.deal.aggregate({
        where: { stage: "DEAL_CLOSED" },
        _sum: { value: true },
      }),
      this.db.property.count({
        where: {
          status: PropertyStatus.ACTIVE_LISTING,
          purpose: ListingPurpose.SALE,
        },
      }),
      this.db.property.count({
        where: {
          status: PropertyStatus.ACTIVE_LISTING,
          purpose: ListingPurpose.RENT,
        },
      }),
      this.db.property.count({ where: { createdAt: { gte: weekAgo } } }),
      this.db.lead.count({
        where: {
          followUpAt: { not: null },
          status: {
            notIn: [
              LeadStatus.IN_PORTFOLIO,
              LeadStatus.PASSIVE,
              LeadStatus.BLACKLIST,
            ],
          },
        },
      }),
      this.db.appointment.count({
        where: {
          startAt: { gte: today, lt: todayEnd },
          status: { notIn: ["CANCELLED"] },
        },
      }),
      this.db.property.count({
        where: { status: PropertyStatus.SOLD, updatedAt: { gte: monthStart } },
      }),
      this.db.property.count({
        where: {
          status: PropertyStatus.RENTED,
          updatedAt: { gte: monthStart },
        },
      }),
      this.db.commission.aggregate({
        where: {
          createdAt: { gte: monthStart },
          status: { notIn: ["CANCELLED"] },
        },
        _sum: { amount: true },
      }),
    ]);

    const conversionRate =
      totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 1000) / 10
        : 0;

    return {
      dailyLeads,
      callsMade,
      conversionRate,
      activeListings,
      salesClosed: closedDeals,
      revenue: Number(revenueAgg._sum.value ?? 0),
      forSale,
      forRent,
      newListingsThisWeek,
      callbacksPending,
      appointmentsToday,
      soldThisMonth,
      rentedThisMonth,
      commissionThisMonth: Number(commissionAgg._sum?.amount ?? 0),
      trend: await this.last7DaysTrend(),
    };
  }

  async dashboard(): Promise<DashboardData> {
    const { userId } = TenantStore.require();
    const [
      kpis,
      regions,
      topSellers,
      topPortfolioBuilders,
      recentListings,
      alarms,
      pendingTasks,
      callCenterConversion,
    ] = await Promise.all([
      this.overview(),
      this.regions(),
      this.topSellers(),
      this.topPortfolioBuilders(),
      this.recentListings(),
      this.alarms(),
      this.pendingTasks(userId),
      this.callCenterConversion(),
    ]);
    return {
      kpis,
      regions,
      topSellers,
      topPortfolioBuilders,
      recentListings,
      alarms,
      pendingTasks,
      callCenterConversion,
    };
  }

  private async pendingTasks(userId?: string | null) {
    const tasks = await this.db.task.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        ...(userId ? { assigneeId: userId } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 8,
      include: { assignee: { select: { fullName: true } } },
    });
    return tasks.map(
      (t): TaskDto => ({
        id: t.id,
        title: t.title,
        type: t.type as TaskDto["type"],
        status: t.status as TaskDto["status"],
        priority: t.priority as TaskDto["priority"],
        assigneeId: t.assigneeId,
        assigneeName: t.assignee?.fullName ?? null,
        dueAt: t.dueAt?.toISOString() ?? null,
        relatedEntity: t.relatedEntity,
        relatedEntityId: t.relatedEntityId,
        createdAt: t.createdAt.toISOString(),
      }),
    );
  }

  private async callCenterConversion(): Promise<number> {
    const companyId = TenantStore.companyId();
    const agents = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        roles: { has: "CALL_CENTER_AGENT" },
      },
      select: { id: true },
    });
    if (!agents.length) return 0;
    const ids = agents.map((a) => a.id);
    const [assigned, converted] = await Promise.all([
      this.prisma.lead.count({
        where: { companyId, assignedToId: { in: ids }, deletedAt: null },
      }),
      this.prisma.lead.count({
        where: {
          companyId,
          assignedToId: { in: ids },
          deletedAt: null,
          status: { in: [LeadStatus.IN_PORTFOLIO, LeadStatus.AGREED] },
        },
      }),
    ]);
    return assigned > 0 ? Math.round((converted / assigned) * 1000) / 10 : 0;
  }

  private async last7DaysTrend(): Promise<OverviewKpis["trend"]> {
    const companyId = TenantStore.companyId();
    const leads: number[] = [];
    const calls: number[] = [];
    const revenue: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const from = startOfDay();
      from.setDate(from.getDate() - i);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const [l, c, r] = await Promise.all([
        this.prisma.lead.count({
          where: {
            companyId,
            deletedAt: null,
            createdAt: { gte: from, lt: to },
          },
        }),
        this.prisma.call.count({
          where: {
            companyId,
            deletedAt: null,
            createdAt: { gte: from, lt: to },
          },
        }),
        this.prisma.deal.aggregate({
          where: {
            companyId,
            stage: "DEAL_CLOSED",
            closedAt: { gte: from, lt: to },
          },
          _sum: { value: true },
        }),
      ]);
      leads.push(l);
      calls.push(c);
      revenue.push(Number(r._sum?.value ?? 0));
    }
    return { leads, calls, revenue };
  }

  private async agentNames(): Promise<Map<string, string>> {
    const companyId = TenantStore.companyId();
    const users = await this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, fullName: true },
    });
    return new Map(users.map((u) => [u.id, u.fullName]));
  }

  private async topSellers(): Promise<TopPerformer[]> {
    const companyId = TenantStore.companyId();
    const grouped = await this.prisma.deal.groupBy({
      by: ["ownerId"],
      where: { companyId, stage: "DEAL_CLOSED", ownerId: { not: null } },
      _sum: { value: true },
    });
    const names = await this.agentNames();
    return grouped
      .map((g) => ({
        agentId: g.ownerId as string,
        agentName: names.get(g.ownerId as string) ?? "Unknown",
        value: Number(g._sum?.value ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  private async topPortfolioBuilders(): Promise<TopPerformer[]> {
    const companyId = TenantStore.companyId();
    const properties = await this.prisma.property.findMany({
      where: {
        companyId,
        deletedAt: null,
        lead: { assignedToId: { not: null } },
      },
      select: { lead: { select: { assignedToId: true } } },
    });
    const counts = new Map<string, number>();
    for (const p of properties) {
      const id = p.lead?.assignedToId;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const names = await this.agentNames();
    return [...counts.entries()]
      .map(([agentId, value]) => ({
        agentId,
        agentName: names.get(agentId) ?? "Unknown",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }

  private async recentListings(): Promise<RecentListing[]> {
    const rows = await this.db.property.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { media: { where: { isCover: true }, take: 1 } },
    });
    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      region: p.region as Region,
      price: Number(p.price),
      status: p.status as PropertyStatus,
      coverUrl: p.media[0]?.url ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  private async alarms(): Promise<DashboardAlarm[]> {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const alarms: DashboardAlarm[] = [];

    const [overdueCallbacks, overdueTasks, pendingModeration, staleLeads] =
      await Promise.all([
        this.db.lead.findMany({
          where: {
            followUpAt: { lt: now, not: null },
            status: {
              notIn: [
                LeadStatus.IN_PORTFOLIO,
                LeadStatus.PASSIVE,
                LeadStatus.BLACKLIST,
              ],
            },
          },
          orderBy: { followUpAt: "asc" },
          take: 10,
          select: { id: true, fullName: true, followUpAt: true },
        }),
        this.db.task.findMany({
          where: { dueAt: { lt: now, not: null }, status: { not: "DONE" } },
          orderBy: { dueAt: "asc" },
          take: 10,
          select: { id: true, title: true, dueAt: true },
        }),
        this.db.onboardingSession.findMany({
          where: { status: "SUBMITTED" },
          orderBy: { submittedAt: "asc" },
          take: 10,
          select: { id: true, ownerName: true, submittedAt: true },
        }),
        this.db.lead.findMany({
          where: {
            status: LeadStatus.NEW,
            assignedToId: null,
            createdAt: { lt: threeDaysAgo },
          },
          orderBy: { createdAt: "asc" },
          take: 10,
          select: { id: true, fullName: true, createdAt: true },
        }),
      ]);

    for (const l of overdueCallbacks) {
      alarms.push({
        id: `cb-${l.id}`,
        kind: "OVERDUE_CALLBACK",
        title: `Overdue callback: ${l.fullName}`,
        detail: `Scheduled for ${l.followUpAt?.toISOString() ?? ""}`,
        severity: "high",
        link: `/leads`,
        at: (l.followUpAt ?? now).toISOString(),
      });
    }
    for (const t of overdueTasks) {
      alarms.push({
        id: `tk-${t.id}`,
        kind: "OVERDUE_TASK",
        title: `Overdue task: ${t.title}`,
        detail: `Due ${t.dueAt?.toISOString() ?? ""}`,
        severity: "medium",
        link: `/tasks`,
        at: (t.dueAt ?? now).toISOString(),
      });
    }
    for (const o of pendingModeration) {
      alarms.push({
        id: `md-${o.id}`,
        kind: "PENDING_MODERATION",
        title: `Awaiting moderation: ${o.ownerName ?? "listing"}`,
        detail: "Owner submitted a listing for review",
        severity: "medium",
        link: `/onboarding`,
        at: (o.submittedAt ?? now).toISOString(),
      });
    }
    for (const l of staleLeads) {
      alarms.push({
        id: `sl-${l.id}`,
        kind: "STALE_LEAD",
        title: `Unassigned lead: ${l.fullName}`,
        detail: "New lead has been waiting > 3 days",
        severity: "low",
        link: `/leads`,
        at: l.createdAt.toISOString(),
      });
    }

    const order = { high: 0, medium: 1, low: 2 } as const;
    return alarms
      .sort((a, b) => order[a.severity] - order[b.severity])
      .slice(0, 15);
  }

  async agents(): Promise<AgentPerformance[]> {
    const companyId = TenantStore.companyId();
    const agents = await this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        roles: { hasSome: ["SALES_AGENT", "CALL_CENTER_AGENT"] },
      },
      select: { id: true, fullName: true },
    });

    return Promise.all(
      agents.map(async (a) => {
        const [callsMade, leadsConverted, assigned, dealsAgg] =
          await Promise.all([
            this.prisma.call.count({ where: { companyId, agentId: a.id } }),
            this.prisma.lead.count({
              where: {
                companyId,
                assignedToId: a.id,
                status: { in: [LeadStatus.IN_PORTFOLIO, LeadStatus.AGREED] },
              },
            }),
            this.prisma.lead.count({
              where: { companyId, assignedToId: a.id },
            }),
            this.prisma.deal.aggregate({
              where: { companyId, ownerId: a.id, stage: "DEAL_CLOSED" },
              _sum: { value: true },
            }),
          ]);
        return {
          agentId: a.id,
          agentName: a.fullName,
          callsMade,
          leadsConverted,
          conversionRate:
            assigned > 0
              ? Math.round((leadsConverted / assigned) * 1000) / 10
              : 0,
          dealsValue: Number(dealsAgg._sum?.value ?? 0),
        };
      }),
    );
  }

  async regions(): Promise<RegionPerformance[]> {
    const companyId = TenantStore.companyId();
    const regions = Object.values(Region);
    return Promise.all(
      regions.map(async (region) => {
        const [activeListings, sold, priceAgg, revenueAgg] = await Promise.all([
          this.prisma.property.count({
            where: {
              companyId,
              region,
              status: PropertyStatus.ACTIVE_LISTING,
              deletedAt: null,
            },
          }),
          this.prisma.property.count({
            where: {
              companyId,
              region,
              status: { in: [PropertyStatus.SOLD, PropertyStatus.RENTED] },
              deletedAt: null,
            },
          }),
          this.prisma.property.aggregate({
            where: { companyId, region, deletedAt: null },
            _avg: { price: true },
          }),
          this.prisma.property.aggregate({
            where: {
              companyId,
              region,
              status: PropertyStatus.SOLD,
              deletedAt: null,
            },
            _sum: { price: true },
          }),
        ]);
        return {
          region,
          activeListings,
          sold,
          avgPrice: Math.round(Number(priceAgg._avg?.price ?? 0)),
          revenue: Number(revenueAgg._sum?.price ?? 0),
        };
      }),
    ).then((rows) => rows.filter((r) => r.activeListings > 0 || r.sold > 0));
  }

  async report(range: ReportRange): Promise<ReportSummary> {
    const companyId = TenantStore.companyId();
    const now = new Date();
    const from = new Date(now);
    if (range === "daily") from.setHours(0, 0, 0, 0);
    else if (range === "weekly") from.setDate(from.getDate() - 7);
    else if (range === "monthly") from.setMonth(from.getMonth() - 1);
    else from.setFullYear(from.getFullYear() - 1);

    const scope = {
      companyId,
      deletedAt: null,
      createdAt: { gte: from, lte: now },
    };

    const [
      newLeads,
      callsMade,
      newListings,
      sold,
      rented,
      revenueAgg,
      totalLeads,
      converted,
    ] = await Promise.all([
      this.prisma.lead.count({ where: scope }),
      this.prisma.call.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { gte: from, lte: now },
        },
      }),
      this.prisma.property.count({ where: scope }),
      this.prisma.property.count({
        where: {
          companyId,
          deletedAt: null,
          status: PropertyStatus.SOLD,
          updatedAt: { gte: from, lte: now },
        },
      }),
      this.prisma.property.count({
        where: {
          companyId,
          deletedAt: null,
          status: PropertyStatus.RENTED,
          updatedAt: { gte: from, lte: now },
        },
      }),
      this.prisma.deal.aggregate({
        where: {
          companyId,
          stage: "DEAL_CLOSED",
          closedAt: { gte: from, lte: now },
        },
        _sum: { value: true },
      }),
      this.prisma.lead.count({ where: scope }),
      this.prisma.lead.count({
        where: {
          ...scope,
          status: { in: [LeadStatus.IN_PORTFOLIO, LeadStatus.AGREED] },
        },
      }),
    ]);

    const names = await this.agentNames();

    const dealsByAgent = await this.prisma.deal.groupBy({
      by: ["ownerId"],
      where: {
        companyId,
        stage: "DEAL_CLOSED",
        ownerId: { not: null },
        closedAt: { gte: from, lte: now },
      },
      _sum: { value: true },
    });
    const topAgentsByDeals: TopPerformer[] = dealsByAgent
      .map((g) => ({
        agentId: g.ownerId as string,
        agentName: names.get(g.ownerId as string) ?? "Unknown",
        value: Number(g._sum?.value ?? 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const leadsByAgent = await this.prisma.lead.groupBy({
      by: ["assignedToId"],
      where: {
        companyId,
        deletedAt: null,
        assignedToId: { not: null },
        createdAt: { gte: from, lte: now },
      },
      _count: { _all: true },
    });
    const topAgentsByLeads: TopPerformer[] = leadsByAgent
      .map((g) => ({
        agentId: g.assignedToId as string,
        agentName: names.get(g.assignedToId as string) ?? "Unknown",
        value: g._count?._all ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      range,
      from: from.toISOString(),
      to: now.toISOString(),
      newLeads,
      callsMade,
      newListings,
      sold,
      rented,
      revenue: Number(revenueAgg._sum?.value ?? 0),
      conversionRate:
        totalLeads > 0 ? Math.round((converted / totalLeads) * 1000) / 10 : 0,
      topAgentsByDeals,
      topAgentsByLeads,
      topRegions: (await this.regions())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5),
    };
  }
}
