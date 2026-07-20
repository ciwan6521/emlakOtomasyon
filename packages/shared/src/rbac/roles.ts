export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  COMPANY_OWNER = "COMPANY_OWNER",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  SALES_AGENT = "SALES_AGENT",
  CALL_CENTER_AGENT = "CALL_CENTER_AGENT",
  CONTENT_MANAGER = "CONTENT_MANAGER",
  PHOTOGRAPHER = "PHOTOGRAPHER",
  FINANCE_OFFICER = "FINANCE_OFFICER",
}

export const ALL_ROLES: Role[] = Object.values(Role);

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.COMPANY_OWNER]: "Company Owner",
  [Role.BRANCH_MANAGER]: "Branch Manager",
  [Role.SALES_AGENT]: "Sales Agent",
  [Role.CALL_CENTER_AGENT]: "Call Center Agent",
  [Role.CONTENT_MANAGER]: "Content Manager",
  [Role.PHOTOGRAPHER]: "Photographer",
  [Role.FINANCE_OFFICER]: "Finance Officer",
};
