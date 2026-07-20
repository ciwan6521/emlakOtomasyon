import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantStore } from "../tenant/tenant-context";

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    const ctx = TenantStore.get();
    if (!ctx?.companyId) return;
    await this.prisma.auditLog.create({
      data: {
        companyId: ctx.companyId,
        actorId: ctx.userId,
        actorEmail: ctx.email,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: (entry.before as object) ?? undefined,
        after: (entry.after as object) ?? undefined,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  }
}
