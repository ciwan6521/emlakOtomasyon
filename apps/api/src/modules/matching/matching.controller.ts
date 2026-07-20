import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { MatchingService } from "./matching.service";

class RunMatchDto {
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() customerId?: string;
}

@ApiTags("matching")
@ApiBearerAuth()
@Controller("matches")
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get("property/:id")
  @RequirePermissions({
    permission: Permission.MATCH_VIEW,
    scope: Scope.BRANCH,
  })
  forProperty(@Param("id") id: string) {
    return this.matching.forProperty(id);
  }

  @Get("customer/:id")
  @RequirePermissions({
    permission: Permission.MATCH_VIEW,
    scope: Scope.BRANCH,
  })
  forCustomer(@Param("id") id: string) {
    return this.matching.forCustomer(id);
  }

  @Post("run")
  @RequirePermissions({ permission: Permission.MATCH_RUN, scope: Scope.BRANCH })
  run(@Body() dto: RunMatchDto) {
    return this.matching.runNow(dto);
  }
}
