import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { UpsertBranchDto } from "./dto";
import { BranchesService } from "./branches.service";

@ApiTags("branches")
@ApiBearerAuth()
@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.ANALYTICS_VIEW,
    scope: Scope.BRANCH,
  })
  list() {
    return this.branches.list();
  }

  @Post()
  @RequirePermissions({
    permission: Permission.BRANCH_MANAGE,
    scope: Scope.COMPANY,
  })
  create(@Body() dto: UpsertBranchDto) {
    return this.branches.create(dto);
  }

  @Put(":id")
  @RequirePermissions({
    permission: Permission.BRANCH_MANAGE,
    scope: Scope.COMPANY,
  })
  update(@Param("id") id: string, @Body() dto: UpsertBranchDto) {
    return this.branches.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions({
    permission: Permission.BRANCH_MANAGE,
    scope: Scope.COMPANY,
  })
  remove(@Param("id") id: string) {
    return this.branches.remove(id);
  }
}
