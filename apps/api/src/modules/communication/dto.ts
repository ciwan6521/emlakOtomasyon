import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CommChannel, CustomerSegment, Locale } from "@reos/shared";

export class CreateTemplateDto {
  @IsString() @MaxLength(120) name!: string;
  @IsEnum(CommChannel) channel!: CommChannel;
  @IsOptional() @IsEnum(Locale) locale?: Locale;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MaxLength(4000) body!: string;
}

export class CreateCampaignDto {
  @IsString() @MaxLength(160) name!: string;
  @IsEnum(CommChannel) channel!: CommChannel;
  @IsString() templateId!: string;
  @IsOptional() @IsEnum(CustomerSegment) segment?: CustomerSegment;
  @IsOptional() @IsArray() @IsString({ each: true }) customerIds?: string[];
}
