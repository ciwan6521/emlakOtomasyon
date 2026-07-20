import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { ExportsService } from "./exports.service";

const RESOURCES = ["leads", "properties", "customers", "deals"] as const;
type Resource = (typeof RESOURCES)[number];

@ApiTags("exports")
@ApiBearerAuth()
@Controller("exports")
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get(":resource.csv")
  @RequirePermissions({
    permission: Permission.DATA_EXPORT,
    scope: Scope.BRANCH,
  })
  async download(
    @Param("resource") resource: string,
    @Res() res: Response,
  ): Promise<void> {
    const key = resource as Resource;
    const csv = RESOURCES.includes(key) ? await this.exports[key]() : "";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${key || "export"}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }
}
