import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  BuildType,
  ListingPurpose,
  Locale,
  MediaType,
  PricePeriod,
  PropertyStatus,
  PropertyType,
  Region,
  RentalTermType,
} from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class CreatePropertyDto {
  @IsString() @MaxLength(180) title!: string;
  @IsEnum(PropertyType) type!: PropertyType;
  @IsEnum(ListingPurpose) purpose!: ListingPurpose;
  @IsEnum(Region) region!: Region;
  @IsString() @MaxLength(300) address!: string;
  @IsOptional() @IsString() @MaxLength(120) neighborhood?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsEnum(PricePeriod) pricePeriod?: PricePeriod;
  @IsOptional() @IsEnum(RentalTermType) rentalTermType?: RentalTermType;
  @IsOptional() @IsString() availableFrom?: string;
  @IsOptional() @Type(() => Number) @IsInt() minLeaseMonths?: number;
  @IsOptional() @Type(() => Number) @IsInt() minStayNights?: number;
  @IsOptional() @IsNumber() nightlyRate?: number;
  @IsOptional() @IsNumber() depositAmount?: number;
  @IsOptional() @IsNumber() managementFeePct?: number;
  @IsString() rooms!: string;
  @IsNumber() @Min(0) sizeM2!: number;
  @IsOptional() @Type(() => Number) @IsInt() floor?: number;
  @IsOptional() @IsEnum(BuildType) buildType?: BuildType;
  @IsOptional() @IsNumber() @Min(0) monthlyDues?: number;
  @IsOptional() @IsBoolean() hasElevator?: boolean;
  @IsOptional() @IsBoolean() hasParking?: boolean;
  @IsOptional() @IsBoolean() hasBalcony?: boolean;
  @IsOptional() @IsBoolean() isFurnished?: boolean;
  @IsOptional() @IsBoolean() hasSeaView?: boolean;
  @IsOptional() @IsBoolean() hasPool?: boolean;
  @IsOptional() @IsBoolean() hasGarden?: boolean;
  @IsString() @MaxLength(160) ownerName!: string;
  @IsString() @MaxLength(40) ownerPhone!: string;
  @IsOptional() @IsString() ownerEmail?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() leadId?: string;
}

export class UpdatePropertyDto {
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsEnum(PricePeriod) pricePeriod?: PricePeriod;
  @IsOptional() @IsEnum(RentalTermType) rentalTermType?: RentalTermType;
  @IsOptional() @IsString() availableFrom?: string;
  @IsOptional() @Type(() => Number) @IsInt() minLeaseMonths?: number;
  @IsOptional() @Type(() => Number) @IsInt() minStayNights?: number;
  @IsOptional() @IsNumber() nightlyRate?: number;
  @IsOptional() @IsNumber() depositAmount?: number;
  @IsOptional() @IsNumber() managementFeePct?: number;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() rooms?: string;
  @IsOptional() @IsNumber() @Min(0) sizeM2?: number;
  @IsOptional() @IsString() @MaxLength(120) neighborhood?: string;
  @IsOptional() @Type(() => Number) @IsInt() floor?: number;
  @IsOptional() @IsEnum(BuildType) buildType?: BuildType;
  @IsOptional() @IsNumber() @Min(0) monthlyDues?: number;
  @IsOptional() @IsBoolean() hasElevator?: boolean;
  @IsOptional() @IsBoolean() hasParking?: boolean;
  @IsOptional() @IsBoolean() hasBalcony?: boolean;
  @IsOptional() @IsBoolean() isFurnished?: boolean;
  @IsOptional() @IsBoolean() hasSeaView?: boolean;
  @IsOptional() @IsBoolean() hasPool?: boolean;
  @IsOptional() @IsBoolean() hasGarden?: boolean;
}

export class TransitionPropertyDto {
  @IsEnum(PropertyStatus) to!: PropertyStatus;
}

export class AddMediaDto {
  @IsEnum(MediaType) type!: MediaType;
  @IsString() url!: string;
  @IsOptional() @IsString() thumbUrl?: string;
  @IsOptional() @IsBoolean() isCover?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() position?: number;
}

export class PresignMediaDto {
  @IsString() @MaxLength(255) filename!: string;
  @IsString() @MaxLength(120) contentType!: string;
}

export class TranslateDto {
  @IsArray() @IsEnum(Locale, { each: true }) locales!: Locale[];
}

export class ListPropertiesQuery extends PaginationQuery {
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @IsOptional() @IsEnum(PropertyType) type?: PropertyType;
  @IsOptional() @IsEnum(ListingPurpose) purpose?: ListingPurpose;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minSizeM2?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxSizeM2?: number;
  @IsOptional() @IsString() rooms?: string;
  @IsOptional() @Type(() => Number) @IsInt() floor?: number;
  @IsOptional() @IsString() neighborhood?: string;
  @IsOptional() @IsEnum(BuildType) buildType?: BuildType;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasElevator?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasParking?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasBalcony?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isFurnished?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasSeaView?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasPool?: boolean;
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasGarden?: boolean;
  @IsOptional() @IsString() search?: string;

  @IsOptional() @IsString() bbox?: string;
}
