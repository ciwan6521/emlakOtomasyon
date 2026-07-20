import { AsyncLocalStorage } from "node:async_hooks";
import { Role } from "@reos/shared";

export interface TenantContext {
  companyId: string;
  branchId: string | null;
  userId: string | null;
  email: string | null;
  roles: Role[];

  bypassTenant: boolean;
  ip?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const TenantStore = {
  run<T>(ctx: TenantContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },
  get(): TenantContext | undefined {
    return storage.getStore();
  },
  companyId(): string {
    return storage.getStore()?.companyId ?? "";
  },
  require(): TenantContext {
    const ctx = storage.getStore();
    if (!ctx)
      throw new Error("TenantContext is not initialized for this request.");
    return ctx;
  },
};
