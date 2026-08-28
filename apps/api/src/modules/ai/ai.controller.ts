import { Body, Controller, NotFoundException, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { Locale, Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { PrismaService } from "../../common/prisma/prisma.service";
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
class SocialCaptionDto {
  @IsString() propertyId!: string;
  @IsOptional() @IsEnum(Locale) locale?: Locale;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(
    private readonly ai: AiAdapter,
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
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

  @Post("social-caption")
  @RequirePermissions({
    permission: Permission.SOCIAL_MANAGE,
    scope: Scope.COMPANY,
  })
  async socialCaption(@Body() dto: SocialCaptionDto) {
    const property = await this.prisma.scoped.property.findFirst({
      where: { id: dto.propertyId },
      include: { company: { select: { currency: true, locale: true } } },
    });
    if (!property) throw new NotFoundException("Property not found");

    return this.ai.caption(
      {
        title: property.title,
        type: property.type,
        region: property.region,
        rooms: property.rooms ?? "",
        sizeM2: Number(property.sizeM2 ?? 0),
        price: Number(property.price),
        currency: property.company.currency,
      },
      dto.locale ?? (property.company.locale as Locale),
    );
  }
}
