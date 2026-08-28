import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { Locale } from "@reos/shared";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateMyLocaleDto {
  @IsEnum(Locale)
  locale!: Locale;
}
