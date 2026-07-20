import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { Region } from "@reos/shared";

export class PublicLeadDto {
  @IsString() @MaxLength(160) fullName!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class InboundMessageDto {
  @IsString() @MaxLength(60) from!: string;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(4000) text?: string;

  @IsOptional() @IsString() @MaxLength(40) channel?: string;
}
