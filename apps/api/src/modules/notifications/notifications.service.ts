import { Injectable } from "@nestjs/common";
import { DomainEvent, NotificationDto, NotificationType } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { TenantStore } from "../../common/tenant/tenant-context";

export interface NotifyInput {
  companyId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private toDto(n: any): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async notify(input: NotifyInput): Promise<void> {
    const companyId = input.companyId ?? TenantStore.companyId();
    if (!companyId || !input.userId) return;
    const n = await this.prisma.notification.create({
      data: {
        companyId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
    this.events.publish(DomainEvent.NOTIFICATION_CREATED, {
      companyId,
      notificationId: n.id,
      userId: input.userId,
      occurredAt: new Date().toISOString(),
    });
  }

  async list(onlyUnread = false): Promise<NotificationDto[]> {
    const { userId } = TenantStore.require();
    const rows = await this.db.notification.findMany({
      where: {
        userId: userId ?? "__none__",
        ...(onlyUnread ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => this.toDto(r));
  }

  async unreadCount(): Promise<{ count: number }> {
    const { userId } = TenantStore.require();
    const count = await this.db.notification.count({
      where: { userId: userId ?? "__none__", read: false },
    });
    return { count };
  }

  async markRead(id: string): Promise<{ ok: true }> {
    const { userId } = TenantStore.require();
    await this.db.notification.updateMany({
      where: { id, userId: userId ?? "__none__" },
      data: { read: true },
    });
    return { ok: true };
  }

  async markAllRead(): Promise<{ ok: true }> {
    const { userId } = TenantStore.require();
    await this.db.notification.updateMany({
      where: { userId: userId ?? "__none__", read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
