import { Controller, Get, Query } from "@nestjs/common";

import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuditLogDto } from "@reos/shared";

import { IsOptional, IsString } from "class-validator";

import { Permission, Scope } from "@reos/shared";

import { RequirePermissions } from "../../common/auth/decorators";

import { PrismaService } from "../../common/prisma/prisma.service";

import { PaginationQuery, paginate } from "../../common/http/pagination";

class AuditQuery extends PaginationQuery {
  @IsOptional() @IsString() actorId?: string;

  @IsOptional() @IsString() entity?: string;

  @IsOptional() @IsString() from?: string;

  @IsOptional() @IsString() to?: string;
}

@ApiTags("audit")
@ApiBearerAuth()
@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.AUDIT_VIEW,
    scope: Scope.COMPANY,
  })
  async list(@Query() q: AuditQuery) {
    const where: Record<string, unknown> = {};

    if (q.actorId) where.actorId = q.actorId;

    if (q.entity) where.entity = q.entity;

    if (q.from || q.to) {
      where.createdAt = {
        ...(q.from ? { gte: new Date(q.from) } : {}),

        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.scoped.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: q.skip,
        take: q.pageSize,
      }),

      this.prisma.scoped.auditLog.count({ where }),
    ]);

    const data: AuditLogDto[] = rows.map((r) => ({
      id: r.id,

      action: r.action,

      entity: r.entity,

      entityId: r.entityId,

      actorEmail: r.actorEmail,

      before: (r.before ?? null) as Record<string, unknown> | null,

      after: (r.after ?? null) as Record<string, unknown> | null,

      ip: r.ip,

      createdAt: r.createdAt.toISOString(),
    }));

    return paginate(data, total, q.page, q.pageSize);
  }
}
