import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { TenantStore } from "../tenant/tenant-context";

const TENANT_MODELS = new Set<string>([
  "Branch",
  "User",
  "Lead",
  "LeadActivity",
  "Call",
  "Property",
  "PropertyMedia",
  "OnboardingSession",
  "Customer",
  "Match",
  "Task",
  "Deal",
  "MessageTemplate",
  "MessageCampaign",
  "MessageDelivery",
  "SocialPost",
  "AuditLog",
  "Appointment",
  "Document",
  "Commission",
  "Invoice",
  "Notification",
  "OwnerProfile",
  "OwnerConversation",
  "PriceHistory",
  "Lease",
  "RentPayment",
  "OwnerPayout",
  "MaintenanceRequest",
  "HandoverRecord",
  "AvailabilityBlock",
]);

const SOFT_DELETE_MODELS = new Set<string>([
  "Company",
  "Branch",
  "User",
  "Lead",
  "Call",
  "Property",
  "PropertyMedia",
  "OnboardingSession",
  "Customer",
  "Task",
  "Deal",
  "MessageTemplate",
  "MessageCampaign",
  "SocialPost",
  "Appointment",
  "Document",
  "Commission",
  "Invoice",
  "OwnerProfile",
  "Lease",
  "MaintenanceRequest",
]);

const READ_OPS = new Set([
  "findFirst",
  "findMany",
  "findUnique",
  "count",
  "aggregate",
  "groupBy",
]);

function injectTenantWhere(
  where: Record<string, unknown> | undefined,
  companyId: string,
) {
  return { ...(where ?? {}), companyId };
}

function injectSoftDeleteWhere(where: Record<string, unknown> | undefined) {
  // Respect explicit deletedAt filters (e.g. when intentionally querying trashed rows).
  if (where && "deletedAt" in where) return where;
  return { ...(where ?? {}), deletedAt: null };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ["warn", "error"] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  get scoped() {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const ctx = TenantStore.get();
            const a = (args ?? {}) as Record<string, any>;

            const isTenantModel = model ? TENANT_MODELS.has(model) : false;
            const isSoftDelete = model ? SOFT_DELETE_MODELS.has(model) : false;
            const bypass = ctx?.bypassTenant === true;

            // Reads: scope by tenant + exclude soft-deleted.
            if (READ_OPS.has(operation)) {
              if (isTenantModel && ctx?.companyId && !bypass) {
                a.where = injectTenantWhere(a.where, ctx.companyId);
              }
              if (isSoftDelete) {
                a.where = injectSoftDeleteWhere(a.where);
              }
              return query(a);
            }

            // Creates: stamp companyId.
            if (
              operation === "create" &&
              isTenantModel &&
              ctx?.companyId &&
              !bypass
            ) {
              a.data = { companyId: ctx.companyId, ...(a.data ?? {}) };
            }
            if (
              operation === "createMany" &&
              isTenantModel &&
              ctx?.companyId &&
              !bypass
            ) {
              const rows = Array.isArray(a.data) ? a.data : [a.data];
              a.data = rows.map((r: Record<string, unknown>) => ({
                companyId: ctx.companyId,
                ...r,
              }));
            }

            // Updates / deletes: scope where by tenant + soft-delete filter.
            if (
              [
                "update",
                "updateMany",
                "delete",
                "deleteMany",
                "upsert",
              ].includes(operation)
            ) {
              if (isTenantModel && ctx?.companyId && !bypass) {
                a.where = injectTenantWhere(a.where, ctx.companyId);
              }
              if (
                isSoftDelete &&
                ["update", "updateMany"].includes(operation)
              ) {
                a.where = injectSoftDeleteWhere(a.where);
              }
            }

            return query(a);
          },
        },
      },
    });
  }

  async softDelete(model: Prisma.ModelName, id: string): Promise<void> {
    const delegate = (this as any)[lowerFirst(model)];
    await delegate.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
