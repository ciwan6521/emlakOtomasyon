import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { CompanySettingsDto, Locale } from "@reos/shared";

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;

  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string;

  @IsOptional() @IsString() @MaxLength(8) currency?: string;

  @IsOptional() @IsEnum(Locale) locale?: Locale;

  @IsOptional() @IsObject() settings?: CompanySettingsDto;
}
