import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, ReportRange, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  overview() {
    return this.analytics.overview();
  }

  @Get("dashboard")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  dashboard() {
    return this.analytics.dashboard();
  }

  @Get("report")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  report(@Query("range") range?: string) {
    const allowed: ReportRange[] = ["daily", "weekly", "monthly", "yearly"];
    const r = (allowed as string[]).includes(range ?? "")
      ? (range as ReportRange)
      : "monthly";
    return this.analytics.report(r);
  }

  @Get("agents")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  agents() {
    return this.analytics.agents();
  }

  @Get("regions")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  regions() {
    return this.analytics.regions();
  }
}
