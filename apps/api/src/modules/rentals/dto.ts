import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  AvailabilityKind,
  HandoverType,
  LeaseStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PaymentMethod,
  RentalPipelineStage,
  RentPaymentStatus,
} from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class CreateLeaseDto {
  @IsString() propertyId!: string;
  @IsString() customerId!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsNumber() monthlyRent?: number;
  @IsOptional() @IsNumber() depositAmount?: number;
  @IsOptional() @IsNumber() managementFeePct?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  rentDueDay?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLeaseDto {
  @IsOptional() @IsEnum(LeaseStatus) status?: LeaseStatus;
  @IsOptional()
  @IsEnum(RentalPipelineStage)
  pipelineStage?: RentalPipelineStage;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() monthlyRent?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() signedAt?: string;
}

export class RecordPaymentDto {
  @IsOptional() @IsNumber() paidAmount?: number;
  @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePayoutDto {
  @IsString() propertyId!: string;
  @IsString() periodStart!: string;
  @IsString() periodEnd!: string;
  @IsOptional() @IsNumber() grossRent?: number;
  @IsOptional() @IsNumber() managementFee?: number;
  @IsOptional() @IsNumber() managementFeePct?: number;
  @IsOptional() @IsNumber() expenses?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateMaintenanceDto {
  @IsString() propertyId!: string;
  @IsOptional() @IsString() leaseId?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsString() reportedBy?: string;
  @IsOptional() @IsString() assignedToId?: string;
}

export class UpdateMaintenanceDto {
  @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() description?: string;
}

export class CreateHandoverDto {
  @IsString() leaseId!: string;
  @IsEnum(HandoverType) type!: HandoverType;
  @IsOptional() @IsObject() checklist?: Record<string, boolean>;
  @IsOptional() @Type(() => Number) @IsInt() keysGiven?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateAvailabilityDto {
  @IsString() propertyId!: string;
  @IsString() startDate!: string;
  @IsString() endDate!: string;
  @IsOptional() @IsEnum(AvailabilityKind) kind?: AvailabilityKind;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ListLeasesQuery extends PaginationQuery {
  @IsOptional() @IsEnum(LeaseStatus) status?: LeaseStatus;
  @IsOptional() @IsString() propertyId?: string;
}

export class ListPaymentsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(RentPaymentStatus) status?: RentPaymentStatus;
  @IsOptional() @IsString() leaseId?: string;
}

export class ListMaintenanceQuery extends PaginationQuery {
  @IsOptional() @IsEnum(MaintenanceStatus) status?: MaintenanceStatus;
  @IsOptional() @IsString() propertyId?: string;
}
