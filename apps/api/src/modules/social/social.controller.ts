import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CreatePostDto, RepostDto } from "./dto";
import { SocialService } from "./social.service";

@ApiTags("social")
@ApiBearerAuth()
@Controller("social/posts")
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.SOCIAL_MANAGE,
    scope: Scope.COMPANY,
  })
  list() {
    return this.social.list();
  }

  @Post()
  @RequirePermissions({
    permission: Permission.SOCIAL_MANAGE,
    scope: Scope.COMPANY,
  })
  create(@Body() dto: CreatePostDto) {
    return this.social.create(dto);
  }

  @Post(":id/repost")
  @RequirePermissions({
    permission: Permission.SOCIAL_MANAGE,
    scope: Scope.COMPANY,
  })
  repost(@Param("id") id: string, @Body() dto: RepostDto) {
    return this.social.repost(id, dto);
  }
}
