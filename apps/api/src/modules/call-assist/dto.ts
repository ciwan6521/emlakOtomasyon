import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
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
  CommChannel,
  ListingPurpose,
  PropertyType,
  Region,
} from "@reos/shared";

export class CallAssistSearchDto {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @IsString() rooms?: string;
  @IsOptional() @IsEnum(PropertyType) type?: PropertyType;
  @IsOptional() @IsEnum(ListingPurpose) purpose?: ListingPurpose;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CallAssistSendDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) propertyIds!: string[];
  @IsEnum(CommChannel) channel!: CommChannel;
  @IsString() @MaxLength(160) recipient!: string;
  @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() leadId?: string;
}
