import { Body, Controller, Get, Patch, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser, Public } from "../../common/auth/decorators";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto, UpdateMyLocaleDto } from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@CurrentUser("id") userId: string) {
    return this.auth.me(userId);
  }

  /** Any signed-in user may change their own UI language, no permission needed. */
  @ApiBearerAuth()
  @Patch("me/locale")
  updateLocale(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateMyLocaleDto,
  ) {
    return this.auth.updateLocale(userId, dto.locale);
  }
}
