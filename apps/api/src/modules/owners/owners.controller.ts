import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { ListOwnersQuery, UpsertOwnerDto, AddConversationDto } from "./dto";
import { OwnersService } from "./owners.service";

@ApiTags("owners")
@ApiBearerAuth()
@Controller("owners")
export class OwnersController {
  constructor(private readonly owners: OwnersService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.OWNER_VIEW,
    scope: Scope.BRANCH,
  })
  list(@Query() query: ListOwnersQuery) {
    return this.owners.list(query);
  }

  @Get(":id")
  @RequirePermissions({
    permission: Permission.OWNER_VIEW,
    scope: Scope.BRANCH,
  })
  get(@Param("id") id: string) {
    return this.owners.get(id);
  }

  @Post("conversations")
  @RequirePermissions({
    permission: Permission.OWNER_MANAGE,
    scope: Scope.BRANCH,
  })
  addConversation(@Body() dto: AddConversationDto) {
    return this.owners.addConversation(dto);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.OWNER_MANAGE,
    scope: Scope.BRANCH,
  })
  create(@Body() dto: UpsertOwnerDto) {
    return this.owners.upsert(dto);
  }

  @Put(":id")
  @RequirePermissions({
    permission: Permission.OWNER_MANAGE,
    scope: Scope.BRANCH,
  })
  update(@Body() dto: UpsertOwnerDto) {
    return this.owners.upsert(dto);
  }
}
