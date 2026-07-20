import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Role } from "@reos/shared";
import { RequestUser } from "../auth/decorators";
import { TenantContext, TenantStore } from "./tenant-context";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as RequestUser | undefined;

    const roles: Role[] = user?.roles ?? [];
    const overrideTenant = req.headers?.["x-tenant-override"] as
      | string
      | undefined;
    const isSuperAdmin = roles.includes(Role.SUPER_ADMIN);

    const ctx: TenantContext = {
      companyId:
        isSuperAdmin && overrideTenant
          ? overrideTenant
          : (user?.companyId ?? ""),
      branchId: user?.branchId ?? null,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      roles,
      bypassTenant: isSuperAdmin && !overrideTenant,
      ip: req.ip,
      userAgent: req.headers?.["user-agent"],
    };

    return new Observable((subscriber) => {
      TenantStore.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
