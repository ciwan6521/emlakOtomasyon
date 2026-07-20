import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import {
  AddMediaDto,
  CreatePropertyDto,
  ListPropertiesQuery,
  PresignMediaDto,
  TransitionPropertyDto,
  TranslateDto,
  UpdatePropertyDto,
} from "./dto";
import { PropertiesService } from "./properties.service";

@ApiTags("properties")
@ApiBearerAuth()
@Controller("properties")
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.PROPERTY_VIEW,
    scope: Scope.BRANCH,
  })
  list(@Query() query: ListPropertiesQuery) {
    return this.properties.list(query);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.PROPERTY_MANAGE,
    scope: Scope.BRANCH,
  })
  create(@Body() dto: CreatePropertyDto) {
    return this.properties.create(dto);
  }

  @Get(":id")
  @RequirePermissions({
    permission: Permission.PROPERTY_VIEW,
    scope: Scope.BRANCH,
  })
  get(@Param("id") id: string) {
    return this.properties.get(id);
  }

  @Patch(":id")
  @RequirePermissions({
    permission: Permission.PROPERTY_MANAGE,
    scope: Scope.BRANCH,
  })
  update(@Param("id") id: string, @Body() dto: UpdatePropertyDto) {
    return this.properties.update(id, dto);
  }

  @Post(":id/transition")
  @RequirePermissions({
    permission: Permission.PROPERTY_MANAGE,
    scope: Scope.BRANCH,
  })
  transition(@Param("id") id: string, @Body() dto: TransitionPropertyDto) {
    return this.properties.transition(id, dto);
  }

  @Post(":id/favorite")
  @RequirePermissions({
    permission: Permission.PROPERTY_VIEW,
    scope: Scope.BRANCH,
  })
  favorite(@Param("id") id: string) {
    return this.properties.favorite(id);
  }

  @Get(":id/broadcast-audience")
  @RequirePermissions({
    permission: Permission.COMMS_SEND,
    scope: Scope.BRANCH,
  })
  broadcastAudience(@Param("id") id: string) {
    return this.properties.broadcastAudience(id);
  }

  @Post(":id/publish")
  @RequirePermissions({
    permission: Permission.PROPERTY_PUBLISH,
    scope: Scope.BRANCH,
  })
  publish(@Param("id") id: string) {
    return this.properties.publish(id);
  }

  @Post(":id/media/presign")
  @RequirePermissions({
    permission: Permission.PROPERTY_MEDIA_MANAGE,
    scope: Scope.BRANCH,
  })
  presignMedia(@Param("id") id: string, @Body() dto: PresignMediaDto) {
    return this.properties.presignMedia(id, dto);
  }

  @Post(":id/media")
  @RequirePermissions({
    permission: Permission.PROPERTY_MEDIA_MANAGE,
    scope: Scope.BRANCH,
  })
  addMedia(@Param("id") id: string, @Body() dto: AddMediaDto) {
    return this.properties.addMedia(id, dto);
  }

  @Post(":id/translate")
  @RequirePermissions({
    permission: Permission.PROPERTY_MANAGE,
    scope: Scope.BRANCH,
  })
  translate(@Param("id") id: string, @Body() dto: TranslateDto) {
    return this.properties.translate(id, dto);
  }
}
