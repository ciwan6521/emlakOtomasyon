import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { TaskPriority, TaskStatus, TaskType } from "@reos/shared";

export class CreateTaskDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsEnum(TaskType) type!: TaskType;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsString() relatedEntity?: string;
  @IsOptional() @IsString() relatedEntityId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @Type(() => Number) @IsInt() position?: number;
  @IsOptional() @IsString() dueAt?: string;
}

export class ListTasksQuery {
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsEnum(TaskType) type?: TaskType;
}
