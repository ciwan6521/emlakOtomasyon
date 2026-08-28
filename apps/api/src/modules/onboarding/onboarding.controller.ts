import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";
import { Permission, Scope } from "@reos/shared";
import { Public, RequirePermissions } from "../../common/auth/decorators";
import { CreateSessionDto, ReviewDto, SubmitOnboardingDto } from "./dto";
import { OnboardingService } from "./onboarding.service";

class PresignOnboardingDto {
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @MaxLength(120) contentType!: string;
}

@ApiTags("onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @ApiBearerAuth()
  @Post("sessions")
  @RequirePermissions({
    permission: Permission.ONBOARDING_CREATE,
    scope: Scope.BRANCH,
  })
  create(@Body() dto: CreateSessionDto) {
    return this.onboarding.createSession(dto.leadId);
  }

  @Public()
  @Get("sessions/:token")
  getByToken(@Param("token") token: string) {
    return this.onboarding.getByToken(token);
  }

  @Public()
  @Post("sessions/:token/presign")
  presign(@Param("token") token: string, @Body() dto: PresignOnboardingDto) {
    return this.onboarding.presignUpload(token, dto);
  }

  @Public()
  @Post("sessions/:token/submit")
  submit(@Param("token") token: string, @Body() dto: SubmitOnboardingDto) {
    return this.onboarding.submit(token, dto);
  }

  @ApiBearerAuth()
  @Get("review")
  @RequirePermissions({
    permission: Permission.ONBOARDING_REVIEW,
    scope: Scope.BRANCH,
  })
  reviewQueue(@Query("status") status?: string) {
    return this.onboarding.reviewQueue(status);
  }

  @ApiBearerAuth()
  @Post("sessions/:id/review")
  @RequirePermissions({
    permission: Permission.ONBOARDING_REVIEW,
    scope: Scope.BRANCH,
  })
  review(@Param("id") id: string, @Body() dto: ReviewDto) {
    return this.onboarding.review(id, dto);
  }
}
