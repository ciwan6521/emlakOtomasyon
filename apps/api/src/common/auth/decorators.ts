import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { Permission, Scope } from "@reos/shared";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = "requiredPermissions";
export interface PermissionRequirement {
  permission: Permission;
  scope?: Scope;
}
export const RequirePermissions = (
  ...perms: (Permission | PermissionRequirement)[]
) =>
  SetMetadata(
    PERMISSIONS_KEY,
    perms.map((p) =>
      typeof p === "string" ? { permission: p, scope: Scope.OWN } : p,
    ),
  );

export interface RequestUser {
  id: string;
  email: string;
  companyId: string;
  branchId: string | null;
  roles: import("@reos/shared").Role[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user?.[data] : user;
  },
);
