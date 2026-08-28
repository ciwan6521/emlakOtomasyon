import { Injectable } from "@nestjs/common";
import { can, maskEmail, maskPhone, Permission, Scope } from "@reos/shared";
import { AuditService } from "../audit/audit.service";
import { TenantStore } from "../tenant/tenant-context";

export interface ContactScopeHint {
  assignedToId?: string | null;
  branchId?: string | null;
}

@Injectable()
export class ContactMaskingService {
  constructor(private readonly audit: AuditService) {}

  private requiredScope(hint: ContactScopeHint): Scope {
    const ctx = TenantStore.get();
    if (hint.assignedToId && ctx?.userId && hint.assignedToId === ctx.userId)
      return Scope.OWN;
    if (hint.branchId && ctx?.branchId && hint.branchId === ctx.branchId)
      return Scope.BRANCH;
    return Scope.COMPANY;
  }

  canReveal(hint: ContactScopeHint = {}): boolean {
    const ctx = TenantStore.get();
    if (!ctx) return false;
    return can(ctx.roles, Permission.CONTACT_REVEAL, this.requiredScope(hint));
  }

  phone(value: string | null | undefined, hint: ContactScopeHint = {}): string {
    return this.canReveal(hint) ? (value ?? "") : maskPhone(value);
  }

  email(
    value: string | null | undefined,
    hint: ContactScopeHint = {},
  ): string | null {
    if (value == null) return null;
    return this.canReveal(hint) ? value : maskEmail(value);
  }

  /**
   * Opaque per-channel identifiers such as a Viber subscriber id. They reach a
   * person just like a phone number does, so they follow the same reveal rule.
   */
  handle(value: string | null | undefined, hint: ContactScopeHint = {}): string {
    return this.canReveal(hint) ? (value ?? "") : maskPhone(value);
  }

  async reveal(
    entity: string,
    entityId: string,
    hint: ContactScopeHint = {},
  ): Promise<boolean> {
    if (!this.canReveal(hint)) return false;
    await this.audit.record({ action: "REVEAL", entity, entityId });
    return true;
  }
}
