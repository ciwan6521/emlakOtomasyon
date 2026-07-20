import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  BuildType,
  ListingPurpose,
  OnboardingDecision,
  PropertyType,
  Region,
} from "@reos/shared";

export class CreateSessionDto {
  @IsOptional() @IsString() leadId?: string;
}

export class SubmitOnboardingDto {
  @IsString() @MaxLength(160) ownerName!: string;
  @IsString() @MaxLength(40) ownerPhone!: string;
  @IsString() @MaxLength(180) title!: string;
  @IsEnum(PropertyType) type!: PropertyType;
  @IsEnum(ListingPurpose) purpose!: ListingPurpose;
  @IsEnum(Region) region!: Region;
  @IsString() @MaxLength(300) address!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsNumber() @Min(0) price!: number;
  @IsString() rooms!: string;
  @IsNumber() @Min(0) sizeM2!: number;
  @IsOptional() @Type(() => Number) floor?: number;
  @IsOptional() @IsNumber() @Min(0) monthlyDues?: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray() @IsString({ each: true }) mediaUrls!: string[];
}

export class ReviewDto {
  @IsEnum(OnboardingDecision) decision!: OnboardingDecision;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
