import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: Scope.BRANCH,
  })
  list() {
    return this.users.list();
  }

  @Post()
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: Scope.BRANCH,
  })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(":id")
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: Scope.BRANCH,
  })
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: Scope.COMPANY,
  })
  remove(@Param("id") id: string) {
    return this.users.remove(id);
  }
}
