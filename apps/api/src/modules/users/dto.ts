import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Role } from "@reos/shared";

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MaxLength(160) fullName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsArray() @ArrayNotEmpty() @IsEnum(Role, { each: true }) roles!: Role[];
  @IsOptional() @IsString() branchId?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsArray() @IsEnum(Role, { each: true }) roles?: Role[];
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}
