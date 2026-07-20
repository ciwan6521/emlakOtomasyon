import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsNumber, IsObject, IsOptional, IsString } from "class-validator";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { AnalyticsService } from "../analytics/analytics.service";
import { AiAdapter } from "../integrations/ai.adapter";

class InsightDto {
  @IsString() question!: string;
}
class PriceDto {
  @IsString() region!: string;
  @IsString() type!: string;
  @IsNumber() sizeM2!: number;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiAdapter,
    private readonly analytics: AnalyticsService,
  ) {}

  @Post("insights")
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  async insights(@Body() dto: InsightDto) {
    const overview = await this.analytics.overview();
    return this.ai.insight(
      dto.question,
      overview as unknown as Record<string, unknown>,
    );
  }

  @Post("pricing")
  @RequirePermissions({
    permission: Permission.PROPERTY_MANAGE,
    scope: Scope.BRANCH,
  })
  pricing(@Body() dto: PriceDto) {
    return this.ai.suggestPrice(dto);
  }
}
