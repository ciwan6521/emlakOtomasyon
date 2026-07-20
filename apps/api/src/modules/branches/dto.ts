import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { Region } from "@reos/shared";

export class UpsertBranchDto {
  @IsString() @MaxLength(160) name!: string;
  @IsEnum(Region) region!: Region;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
}
