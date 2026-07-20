import { Role } from "./roles";

export enum Scope {
  OWN = "own",
  BRANCH = "branch",
  COMPANY = "company",
  ALL = "all",
}

export const SCOPE_RANK: Record<Scope, number> = {
  [Scope.OWN]: 0,
  [Scope.BRANCH]: 1,
  [Scope.COMPANY]: 2,
  [Scope.ALL]: 3,
};

export enum Permission {
  // identity / tenant
  TENANT_MANAGE = "tenant:manage",
  USER_MANAGE = "user:manage",
  ROLE_MANAGE = "role:manage",

  // leads
  LEAD_VIEW = "lead:view",
  LEAD_CREATE = "lead:create",
  LEAD_EDIT = "lead:edit",
  LEAD_ASSIGN = "lead:assign",
  LEAD_TRANSITION = "lead:transition",

  // call center
  CALL_RUN_QUEUE = "call:run_queue",
  CALL_LOG = "call:log",
  CALL_AUDIT = "call:audit",

  // property
  PROPERTY_VIEW = "property:view",
  PROPERTY_MANAGE = "property:manage",
  PROPERTY_MEDIA_MANAGE = "property:media_manage",
  PROPERTY_PUBLISH = "property:publish",

  // onboarding
  ONBOARDING_CREATE = "onboarding:create",
  ONBOARDING_REVIEW = "onboarding:review",

  // customer
  CUSTOMER_VIEW = "customer:view",
  CUSTOMER_MANAGE = "customer:manage",

  // owner CRM
  OWNER_VIEW = "owner:view",
  OWNER_MANAGE = "owner:manage",

  // branch management
  BRANCH_MANAGE = "branch:manage",

  // matching
  MATCH_VIEW = "match:view",
  MATCH_RUN = "match:run",

  // communication
  COMMS_SEND = "comms:send",
  COMMS_TEMPLATE_MANAGE = "comms:template_manage",

  // social
  SOCIAL_MANAGE = "social:manage",

  // tasks
  TASK_VIEW = "task:view",
  TASK_MANAGE = "task:manage",

  // pipeline / deals
  DEAL_VIEW = "deal:view",
  DEAL_MANAGE = "deal:manage",

  // appointments / viewings
  APPOINTMENT_VIEW = "appointment:view",
  APPOINTMENT_MANAGE = "appointment:manage",

  // documents
  DOCUMENT_VIEW = "document:view",
  DOCUMENT_MANAGE = "document:manage",

  // finance — commissions / invoices
  COMMISSION_VIEW = "commission:view",
  COMMISSION_MANAGE = "commission:manage",
  INVOICE_VIEW = "invoice:view",
  INVOICE_MANAGE = "invoice:manage",

  // rental operations
  RENTAL_VIEW = "rental:view",
  RENTAL_MANAGE = "rental:manage",

  // analytics / finance
  ANALYTICS_VIEW = "analytics:view",
  FINANCE_VIEW = "finance:view",
  DATA_EXPORT = "data:export",

  // sensitive
  CONTACT_REVEAL = "contact:reveal",

  // audit
  AUDIT_VIEW = "audit:view",
}

export interface ScopedPermission {
  permission: Permission;
  scope: Scope;
}

const sp = (permission: Permission, scope: Scope): ScopedPermission => ({
  permission,
  scope,
});

export const ROLE_PERMISSIONS: Record<Role, ScopedPermission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission).map((p) => sp(p, Scope.ALL)),

  [Role.COMPANY_OWNER]: [
    sp(Permission.USER_MANAGE, Scope.COMPANY),
    sp(Permission.ROLE_MANAGE, Scope.COMPANY),
    sp(Permission.LEAD_VIEW, Scope.COMPANY),
    sp(Permission.LEAD_CREATE, Scope.COMPANY),
    sp(Permission.LEAD_EDIT, Scope.COMPANY),
    sp(Permission.LEAD_ASSIGN, Scope.COMPANY),
    sp(Permission.LEAD_TRANSITION, Scope.COMPANY),
    sp(Permission.CALL_RUN_QUEUE, Scope.COMPANY),
    sp(Permission.CALL_LOG, Scope.COMPANY),
    sp(Permission.CALL_AUDIT, Scope.COMPANY),
    sp(Permission.PROPERTY_VIEW, Scope.COMPANY),
    sp(Permission.PROPERTY_MANAGE, Scope.COMPANY),
    sp(Permission.PROPERTY_MEDIA_MANAGE, Scope.COMPANY),
    sp(Permission.PROPERTY_PUBLISH, Scope.COMPANY),
    sp(Permission.ONBOARDING_CREATE, Scope.COMPANY),
    sp(Permission.ONBOARDING_REVIEW, Scope.COMPANY),
    sp(Permission.CUSTOMER_VIEW, Scope.COMPANY),
    sp(Permission.CUSTOMER_MANAGE, Scope.COMPANY),
    sp(Permission.OWNER_VIEW, Scope.COMPANY),
    sp(Permission.OWNER_MANAGE, Scope.COMPANY),
    sp(Permission.BRANCH_MANAGE, Scope.COMPANY),
    sp(Permission.MATCH_VIEW, Scope.COMPANY),
    sp(Permission.MATCH_RUN, Scope.COMPANY),
    sp(Permission.COMMS_SEND, Scope.COMPANY),
    sp(Permission.COMMS_TEMPLATE_MANAGE, Scope.COMPANY),
    sp(Permission.SOCIAL_MANAGE, Scope.COMPANY),
    sp(Permission.TASK_VIEW, Scope.COMPANY),
    sp(Permission.TASK_MANAGE, Scope.COMPANY),
    sp(Permission.DEAL_VIEW, Scope.COMPANY),
    sp(Permission.DEAL_MANAGE, Scope.COMPANY),
    sp(Permission.ANALYTICS_VIEW, Scope.COMPANY),
    sp(Permission.FINANCE_VIEW, Scope.COMPANY),
    sp(Permission.DATA_EXPORT, Scope.COMPANY),
    sp(Permission.CONTACT_REVEAL, Scope.COMPANY),
    sp(Permission.AUDIT_VIEW, Scope.COMPANY),
    sp(Permission.APPOINTMENT_VIEW, Scope.COMPANY),
    sp(Permission.APPOINTMENT_MANAGE, Scope.COMPANY),
    sp(Permission.DOCUMENT_VIEW, Scope.COMPANY),
    sp(Permission.DOCUMENT_MANAGE, Scope.COMPANY),
    sp(Permission.COMMISSION_VIEW, Scope.COMPANY),
    sp(Permission.COMMISSION_MANAGE, Scope.COMPANY),
    sp(Permission.INVOICE_VIEW, Scope.COMPANY),
    sp(Permission.INVOICE_MANAGE, Scope.COMPANY),
    sp(Permission.RENTAL_VIEW, Scope.COMPANY),
    sp(Permission.RENTAL_MANAGE, Scope.COMPANY),
  ],

  [Role.BRANCH_MANAGER]: [
    sp(Permission.USER_MANAGE, Scope.BRANCH),
    sp(Permission.LEAD_VIEW, Scope.BRANCH),
    sp(Permission.LEAD_CREATE, Scope.BRANCH),
    sp(Permission.LEAD_EDIT, Scope.BRANCH),
    sp(Permission.LEAD_ASSIGN, Scope.BRANCH),
    sp(Permission.LEAD_TRANSITION, Scope.BRANCH),
    sp(Permission.CALL_RUN_QUEUE, Scope.BRANCH),
    sp(Permission.CALL_LOG, Scope.BRANCH),
    sp(Permission.CALL_AUDIT, Scope.BRANCH),
    sp(Permission.PROPERTY_VIEW, Scope.BRANCH),
    sp(Permission.PROPERTY_MANAGE, Scope.BRANCH),
    sp(Permission.PROPERTY_MEDIA_MANAGE, Scope.BRANCH),
    sp(Permission.PROPERTY_PUBLISH, Scope.BRANCH),
    sp(Permission.ONBOARDING_CREATE, Scope.BRANCH),
    sp(Permission.ONBOARDING_REVIEW, Scope.BRANCH),
    sp(Permission.CUSTOMER_VIEW, Scope.BRANCH),
    sp(Permission.CUSTOMER_MANAGE, Scope.BRANCH),
    sp(Permission.OWNER_VIEW, Scope.BRANCH),
    sp(Permission.OWNER_MANAGE, Scope.BRANCH),
    sp(Permission.MATCH_VIEW, Scope.BRANCH),
    sp(Permission.MATCH_RUN, Scope.BRANCH),
    sp(Permission.COMMS_SEND, Scope.BRANCH),
    sp(Permission.TASK_VIEW, Scope.BRANCH),
    sp(Permission.TASK_MANAGE, Scope.BRANCH),
    sp(Permission.DEAL_VIEW, Scope.BRANCH),
    sp(Permission.DEAL_MANAGE, Scope.BRANCH),
    sp(Permission.ANALYTICS_VIEW, Scope.BRANCH),
    sp(Permission.DATA_EXPORT, Scope.BRANCH),
    sp(Permission.CONTACT_REVEAL, Scope.BRANCH),
    sp(Permission.APPOINTMENT_VIEW, Scope.BRANCH),
    sp(Permission.APPOINTMENT_MANAGE, Scope.BRANCH),
    sp(Permission.DOCUMENT_VIEW, Scope.BRANCH),
    sp(Permission.DOCUMENT_MANAGE, Scope.BRANCH),
    sp(Permission.COMMISSION_VIEW, Scope.BRANCH),
    sp(Permission.INVOICE_VIEW, Scope.BRANCH),
    sp(Permission.RENTAL_VIEW, Scope.BRANCH),
    sp(Permission.RENTAL_MANAGE, Scope.BRANCH),
  ],

  [Role.SALES_AGENT]: [
    sp(Permission.LEAD_VIEW, Scope.OWN),
    sp(Permission.LEAD_EDIT, Scope.OWN),
    sp(Permission.LEAD_TRANSITION, Scope.OWN),
    sp(Permission.PROPERTY_VIEW, Scope.BRANCH),
    sp(Permission.PROPERTY_MANAGE, Scope.BRANCH),
    sp(Permission.PROPERTY_MEDIA_MANAGE, Scope.BRANCH),
    sp(Permission.CUSTOMER_VIEW, Scope.OWN),
    sp(Permission.CUSTOMER_MANAGE, Scope.OWN),
    sp(Permission.OWNER_VIEW, Scope.BRANCH),
    sp(Permission.OWNER_MANAGE, Scope.BRANCH),
    sp(Permission.MATCH_VIEW, Scope.BRANCH),
    sp(Permission.COMMS_SEND, Scope.BRANCH),
    sp(Permission.TASK_VIEW, Scope.OWN),
    sp(Permission.TASK_MANAGE, Scope.OWN),
    sp(Permission.DEAL_VIEW, Scope.OWN),
    sp(Permission.DEAL_MANAGE, Scope.OWN),
    sp(Permission.CONTACT_REVEAL, Scope.OWN),
    sp(Permission.APPOINTMENT_VIEW, Scope.OWN),
    sp(Permission.APPOINTMENT_MANAGE, Scope.OWN),
    sp(Permission.DOCUMENT_VIEW, Scope.BRANCH),
    sp(Permission.DOCUMENT_MANAGE, Scope.OWN),
    sp(Permission.COMMISSION_VIEW, Scope.OWN),
    sp(Permission.RENTAL_VIEW, Scope.BRANCH),
    sp(Permission.RENTAL_MANAGE, Scope.BRANCH),
  ],

  [Role.CALL_CENTER_AGENT]: [
    sp(Permission.LEAD_VIEW, Scope.OWN),
    sp(Permission.LEAD_EDIT, Scope.OWN),
    sp(Permission.LEAD_TRANSITION, Scope.OWN),
    sp(Permission.CALL_RUN_QUEUE, Scope.OWN),
    sp(Permission.CALL_LOG, Scope.OWN),
    sp(Permission.CUSTOMER_VIEW, Scope.OWN),
    sp(Permission.CUSTOMER_MANAGE, Scope.OWN),
    sp(Permission.OWNER_VIEW, Scope.BRANCH),
    sp(Permission.OWNER_MANAGE, Scope.OWN),
    sp(Permission.MATCH_VIEW, Scope.BRANCH),
    sp(Permission.COMMS_SEND, Scope.BRANCH),
    sp(Permission.TASK_VIEW, Scope.OWN),
    sp(Permission.CONTACT_REVEAL, Scope.OWN),
    sp(Permission.APPOINTMENT_VIEW, Scope.OWN),
    sp(Permission.APPOINTMENT_MANAGE, Scope.OWN),
    sp(Permission.RENTAL_VIEW, Scope.BRANCH),
  ],

  [Role.CONTENT_MANAGER]: [
    sp(Permission.PROPERTY_VIEW, Scope.COMPANY),
    sp(Permission.PROPERTY_MANAGE, Scope.COMPANY),
    sp(Permission.PROPERTY_MEDIA_MANAGE, Scope.COMPANY),
    sp(Permission.PROPERTY_PUBLISH, Scope.COMPANY),
    sp(Permission.ONBOARDING_REVIEW, Scope.COMPANY),
    sp(Permission.COMMS_SEND, Scope.COMPANY),
    sp(Permission.COMMS_TEMPLATE_MANAGE, Scope.COMPANY),
    sp(Permission.SOCIAL_MANAGE, Scope.COMPANY),
    sp(Permission.TASK_VIEW, Scope.COMPANY),
    sp(Permission.TASK_MANAGE, Scope.COMPANY),
    sp(Permission.DOCUMENT_VIEW, Scope.COMPANY),
    sp(Permission.DOCUMENT_MANAGE, Scope.COMPANY),
  ],

  [Role.PHOTOGRAPHER]: [
    sp(Permission.PROPERTY_VIEW, Scope.BRANCH),
    sp(Permission.PROPERTY_MEDIA_MANAGE, Scope.BRANCH),
    sp(Permission.TASK_VIEW, Scope.OWN),
    sp(Permission.TASK_MANAGE, Scope.OWN),
    sp(Permission.APPOINTMENT_VIEW, Scope.BRANCH),
  ],

  [Role.FINANCE_OFFICER]: [
    sp(Permission.DEAL_VIEW, Scope.COMPANY),
    sp(Permission.ANALYTICS_VIEW, Scope.COMPANY),
    sp(Permission.FINANCE_VIEW, Scope.COMPANY),
    sp(Permission.DATA_EXPORT, Scope.COMPANY),
    sp(Permission.COMMISSION_VIEW, Scope.COMPANY),
    sp(Permission.COMMISSION_MANAGE, Scope.COMPANY),
    sp(Permission.INVOICE_VIEW, Scope.COMPANY),
    sp(Permission.INVOICE_MANAGE, Scope.COMPANY),
    sp(Permission.DOCUMENT_VIEW, Scope.COMPANY),
    sp(Permission.RENTAL_VIEW, Scope.COMPANY),
    sp(Permission.RENTAL_MANAGE, Scope.COMPANY),
  ],
};

export function resolvePermissions(roles: Role[]): Map<Permission, Scope> {
  const result = new Map<Permission, Scope>();
  for (const role of roles) {
    for (const { permission, scope } of ROLE_PERMISSIONS[role] ?? []) {
      const existing = result.get(permission);
      if (existing === undefined || SCOPE_RANK[scope] > SCOPE_RANK[existing]) {
        result.set(permission, scope);
      }
    }
  }
  return result;
}

export function can(
  roles: Role[],
  permission: Permission,
  requiredScope: Scope = Scope.OWN,
): boolean {
  const granted = resolvePermissions(roles).get(permission);
  return (
    granted !== undefined && SCOPE_RANK[granted] >= SCOPE_RANK[requiredScope]
  );
}
