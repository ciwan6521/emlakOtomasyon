import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { can, Role } from "@reos/shared";
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  RequestUser,
} from "./decorators";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionRequirement[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as
      | RequestUser
      | undefined;
    if (!user) throw new ForbiddenException("Authentication required");

    const roles: Role[] = user.roles ?? [];
    for (const req of required) {
      if (!can(roles, req.permission, req.scope)) {
        throw new ForbiddenException(`Missing permission: ${req.permission}`);
      }
    }
    return true;
  }
}
