import { can, Permission, Role, Scope } from "@reos/shared";

describe("RBAC can()", () => {
  it("grants super admin company-wide analytics", () => {
    expect(
      can([Role.SUPER_ADMIN], Permission.ANALYTICS_VIEW, Scope.COMPANY),
    ).toBe(true);
  });

  it("denies a sales agent access to analytics", () => {
    expect(
      can([Role.SALES_AGENT], Permission.ANALYTICS_VIEW, Scope.COMPANY),
    ).toBe(false);
  });

  it("lets a wider scope satisfy a narrower requirement", () => {
    // Company owner manages users company-wide → satisfies an OWN-scoped check.
    expect(can([Role.COMPANY_OWNER], Permission.USER_MANAGE, Scope.OWN)).toBe(
      true,
    );
  });

  it("rejects a narrower grant against a wider requirement", () => {
    // Photographer manages media only at branch scope → not company scope.
    expect(
      can([Role.PHOTOGRAPHER], Permission.PROPERTY_MEDIA_MANAGE, Scope.COMPANY),
    ).toBe(false);
    expect(
      can([Role.PHOTOGRAPHER], Permission.PROPERTY_MEDIA_MANAGE, Scope.BRANCH),
    ).toBe(true);
  });

  it("combines permissions across multiple roles", () => {
    const roles = [Role.FINANCE_OFFICER, Role.PHOTOGRAPHER];
    expect(can(roles, Permission.FINANCE_VIEW, Scope.COMPANY)).toBe(true);
    expect(can(roles, Permission.PROPERTY_MEDIA_MANAGE, Scope.BRANCH)).toBe(
      true,
    );
  });

  it("returns false for a permission no role grants", () => {
    expect(
      can([Role.CALL_CENTER_AGENT], Permission.TENANT_MANAGE, Scope.ALL),
    ).toBe(false);
  });
});
