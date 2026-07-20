import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { CreateDealDto, MoveStageDto } from "./dto";
import { PipelineService } from "./pipeline.service";

@ApiTags("pipeline")
@ApiBearerAuth()
@Controller("pipeline/deals")
export class PipelineController {
  constructor(private readonly pipeline: PipelineService) {}

  @Get()
  @RequirePermissions({ permission: Permission.DEAL_VIEW, scope: Scope.OWN })
  board() {
    return this.pipeline.board();
  }

  @Post()
  @RequirePermissions({ permission: Permission.DEAL_MANAGE, scope: Scope.OWN })
  create(@Body() dto: CreateDealDto) {
    return this.pipeline.create(dto);
  }

  @Patch(":id/stage")
  @RequirePermissions({ permission: Permission.DEAL_MANAGE, scope: Scope.OWN })
  moveStage(@Param("id") id: string, @Body() dto: MoveStageDto) {
    return this.pipeline.moveStage(id, dto);
  }
}
