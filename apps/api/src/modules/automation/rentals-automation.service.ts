import { Injectable, Logger } from "@nestjs/common";
import { LeaseStatus, NotificationType, RentPaymentStatus } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class RentalsAutomationService {
  private readonly logger = new Logger(RentalsAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async processOverduePayments(): Promise<number> {
    const now = new Date();
    const overdue = await this.prisma.rentPayment.findMany({
      where: { status: RentPaymentStatus.PENDING, dueDate: { lt: now } },
      include: {
        property: { select: { title: true, reference: true } },
        lease: { include: { customer: { select: { fullName: true } } } },
      },
      take: 200,
    });
    if (!overdue.length) return 0;

    await this.prisma.rentPayment.updateMany({
      where: { id: { in: overdue.map((p) => p.id) } },
      data: { status: RentPaymentStatus.OVERDUE },
    });

    const byCompany = new Map<string, typeof overdue>();
    for (const p of overdue) {
      const list = byCompany.get(p.companyId) ?? [];
      list.push(p);
      byCompany.set(p.companyId, list);
    }

    for (const [companyId, payments] of byCompany) {
      const recipients = await this.financeRecipients(companyId);
      for (const u of recipients) {
        await this.notifications.notify({
          companyId,
          userId: u.id,
          type: NotificationType.RENT_OVERDUE,
          title: `${payments.length} overdue rent payment(s)`,
          body: payments
            .slice(0, 3)
            .map((p) => `${p.property.title} — ${p.lease.customer.fullName}`)
            .join("; "),
          link: "/rentals",
        });
      }
    }

    this.logger.log(`Marked ${overdue.length} rent payment(s) overdue`);
    return overdue.length;
  }

  async processRentDueReminders(): Promise<number> {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 3);

    const dueSoon = await this.prisma.rentPayment.findMany({
      where: {
        status: RentPaymentStatus.PENDING,
        dueDate: { gte: now, lte: horizon },
      },
      include: {
        property: { select: { title: true } },
        lease: { include: { customer: { select: { fullName: true } } } },
      },
      take: 200,
    });

    let sent = 0;
    for (const p of dueSoon) {
      const recent = await this.prisma.notification.count({
        where: {
          companyId: p.companyId,
          type: NotificationType.RENT_DUE,
          link: `/rentals`,
          createdAt: { gte: new Date(Date.now() - 20 * 3600_000) },
          body: { contains: p.id },
        },
      });
      if (recent > 0) continue;

      const recipients = await this.financeRecipients(p.companyId);
      for (const u of recipients) {
        await this.notifications.notify({
          companyId: p.companyId,
          userId: u.id,
          type: NotificationType.RENT_DUE,
          title: "Upcoming rent payment",
          body: `${p.property.title} — ${p.lease.customer.fullName} — ${p.dueDate.toLocaleDateString()} [${p.id}]`,
          link: "/rentals",
        });
        sent++;
      }
    }
    if (sent) this.logger.log(`Sent ${sent} rent-due reminder(s)`);
    return sent;
  }

  async processLeaseExpiring(): Promise<number> {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);

    const expiring = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        endDate: { gte: now, lte: horizon },
        deletedAt: null,
      },
      include: {
        property: { select: { title: true, reference: true } },
        customer: { select: { fullName: true } },
      },
      take: 100,
    });

    let sent = 0;
    for (const l of expiring) {
      const recent = await this.prisma.notification.count({
        where: {
          companyId: l.companyId,
          type: NotificationType.LEASE_EXPIRING,
          link: `/rentals`,
          createdAt: { gte: new Date(Date.now() - 7 * 86400_000) },
          body: { contains: l.id },
        },
      });
      if (recent > 0) continue;

      const recipients = await this.financeRecipients(l.companyId);
      for (const u of recipients) {
        await this.notifications.notify({
          companyId: l.companyId,
          userId: u.id,
          type: NotificationType.LEASE_EXPIRING,
          title: "Lease expiring soon",
          body: `${l.property.title} — ${l.customer.fullName} — ${l.endDate.toLocaleDateString()} [${l.id}]`,
          link: "/rentals",
        });
        sent++;
      }
    }
    if (sent) this.logger.log(`Sent ${sent} lease-expiring alert(s)`);
    return sent;
  }

  private async financeRecipients(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        companyId,
        deletedAt: null,
        isActive: true,
        roles: {
          hasSome: [
            "COMPANY_OWNER",
            "BRANCH_MANAGER",
            "FINANCE_OFFICER",
            "SALES_AGENT",
          ],
        },
      },
      select: { id: true },
      take: 15,
    });
  }
}
