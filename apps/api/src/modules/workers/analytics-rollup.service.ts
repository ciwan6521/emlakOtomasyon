import { Injectable, Logger } from "@nestjs/common";
import { LeadStatus } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class AnalyticsRollupService {
  private readonly logger = new Logger(AnalyticsRollupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async rollupCompany(companyId: string, day = startOfDay()): Promise<void> {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await this.prisma.auditLog.count({
      where: {
        companyId,
        action: "ANALYTICS_ROLLUP",
        entity: "company",
        createdAt: { gte: day, lt: nextDay },
      },
    });
    if (existing > 0) return;

    const [dailyLeads, callsMade, activeListings, closedDeals, revenueAgg] =
      await Promise.all([
        this.prisma.lead.count({
          where: {
            companyId,
            createdAt: { gte: day, lt: nextDay },
            deletedAt: null,
          },
        }),
        this.prisma.call.count({
          where: { companyId, createdAt: { gte: day, lt: nextDay } },
        }),
        this.prisma.property.count({
          where: { companyId, status: "ACTIVE_LISTING", deletedAt: null },
        }),
        this.prisma.deal.count({
          where: {
            companyId,
            stage: "DEAL_CLOSED",
            closedAt: { gte: day, lt: nextDay },
            deletedAt: null,
          },
        }),
        this.prisma.deal.aggregate({
          where: {
            companyId,
            stage: "DEAL_CLOSED",
            closedAt: { gte: day, lt: nextDay },
            deletedAt: null,
          },
          _sum: { value: true },
        }),
      ]);

    const converted = await this.prisma.lead.count({
      where: {
        companyId,
        status: { in: [LeadStatus.IN_PORTFOLIO, LeadStatus.AGREED] },
        deletedAt: null,
      },
    });
    const totalLeads = await this.prisma.lead.count({
      where: { companyId, deletedAt: null },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        action: "ANALYTICS_ROLLUP",
        entity: "company",
        entityId: companyId,
        after: {
          date: day.toISOString().slice(0, 10),
          dailyLeads,
          callsMade,
          activeListings,
          closedDeals,
          revenue: Number(revenueAgg._sum.value ?? 0),
          conversionRate:
            totalLeads > 0
              ? Math.round((converted / totalLeads) * 1000) / 10
              : 0,
        },
      },
    });
  }

  async rollupAllCompanies(): Promise<number> {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    for (const c of companies) {
      await this.rollupCompany(c.id);
    }
    this.logger.log(
      `Analytics rollup completed for ${companies.length} tenant(s)`,
    );
    return companies.length;
  }
}
