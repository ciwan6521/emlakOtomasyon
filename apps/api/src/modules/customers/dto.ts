import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  CustomerIntent,
  CustomerKind,
  CustomerSegment,
  FinancingType,
  ListingPurpose,
  PropertyType,
  Region,
  Residency,
} from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class CreateCustomerDto {
  @IsString() @MaxLength(160) fullName!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() @MaxLength(40) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(64) viberId?: string;
  @IsEnum(CustomerKind) kind!: CustomerKind;
  @IsEnum(CustomerIntent) intent!: CustomerIntent;
  @IsOptional() @IsEnum(CustomerSegment) segment?: CustomerSegment;
  @IsNumber() @Min(0) budgetMin!: number;
  @IsNumber() @Min(0) budgetMax!: number;
  @IsArray() @IsEnum(Region, { each: true }) preferredRegions!: Region[];
  @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @IsOptional() @IsString() roomRequirement?: string;
  @IsOptional() @IsEnum(FinancingType) financing?: FinancingType;
  @IsOptional() @IsEnum(Residency) residency?: Residency;
  @IsOptional() @IsEnum(ListingPurpose) preferredPurpose?: ListingPurpose;
  @IsOptional() @IsString() moveInDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() leaseMonths?: number;
  @IsOptional() petsAllowed?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() occupants?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsEnum(CustomerSegment) segment?: CustomerSegment;
  @IsOptional() @IsNumber() @Min(0) budgetMin?: number;
  @IsOptional() @IsNumber() @Min(0) budgetMax?: number;
  @IsOptional()
  @IsArray()
  @IsEnum(Region, { each: true })
  preferredRegions?: Region[];
  @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @IsOptional() @IsString() roomRequirement?: string;
  @IsOptional() @IsEnum(FinancingType) financing?: FinancingType;
  @IsOptional() @IsEnum(Residency) residency?: Residency;
  @IsOptional() @IsEnum(ListingPurpose) preferredPurpose?: ListingPurpose;
  @IsOptional() @IsString() moveInDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() leaseMonths?: number;
  @IsOptional() petsAllowed?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() occupants?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(40) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(64) viberId?: string;
}

export class ListCustomersQuery extends PaginationQuery {
  @IsOptional() @IsEnum(CustomerSegment) segment?: CustomerSegment;
  @IsOptional() @IsEnum(CustomerKind) kind?: CustomerKind;
  @IsOptional() @IsEnum(CustomerIntent) intent?: CustomerIntent;
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @Type(() => Number) @IsNumber() minBudget?: number;
  @IsOptional() @IsString() search?: string;
}
