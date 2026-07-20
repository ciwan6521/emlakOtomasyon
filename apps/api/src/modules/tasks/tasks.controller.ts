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
import { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from "./dto";
import { TasksService } from "./tasks.service";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermissions({ permission: Permission.TASK_VIEW, scope: Scope.OWN })
  board(@Query() query: ListTasksQuery) {
    return this.tasks.board(query);
  }

  @Post()
  @RequirePermissions({ permission: Permission.TASK_MANAGE, scope: Scope.OWN })
  create(@Body() dto: CreateTaskDto) {
    return this.tasks.create(dto);
  }

  @Patch(":id")
  @RequirePermissions({ permission: Permission.TASK_MANAGE, scope: Scope.OWN })
  update(@Param("id") id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }
}
