import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { CommissionStatus, InvoiceStatus } from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class CreateCommissionDto {
  @IsString() dealId!: string;
  @IsOptional() @IsString() agentId?: string;
  @IsNumber() @Min(0) baseAmount!: number;
  @IsNumber() @Min(0) ratePct!: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ChangeCommissionStatusDto {
  @IsEnum(CommissionStatus) status!: CommissionStatus;
}

export class ListCommissionsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(CommissionStatus) status?: CommissionStatus;
  @IsOptional() @IsString() agentId?: string;
  @IsOptional() @IsString() dealId?: string;
}

export class CreateInvoiceDto {
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() dueAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ChangeInvoiceStatusDto {
  @IsEnum(InvoiceStatus) status!: InvoiceStatus;
}

export class ListInvoicesQuery extends PaginationQuery {
  @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @IsOptional() @IsString() customerId?: string;
}
