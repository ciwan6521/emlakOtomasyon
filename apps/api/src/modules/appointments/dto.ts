import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { AppointmentStatus } from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class CreateAppointmentDto {
  @IsString() @MaxLength(200) title!: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() @MaxLength(300) location?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() agentId?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() @MaxLength(300) location?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() agentId?: string;
}

export class ChangeAppointmentStatusDto {
  @IsEnum(AppointmentStatus) status!: AppointmentStatus;
}

export class ListAppointmentsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @Type(() => String) @IsDateString() from?: string;
  @IsOptional() @Type(() => String) @IsDateString() to?: string;
}
