import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { RepostStrategy, SocialChannel } from "@reos/shared";

export class CreatePostDto {
  @IsOptional() @IsString() propertyId?: string;
  @IsArray() @IsEnum(SocialChannel, { each: true }) channels!: SocialChannel[];
  @IsString() @MaxLength(2200) caption!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) mediaUrls?: string[];
  @IsOptional() @IsString() scheduleAt?: string;
}

export class RepostDto {
  @IsEnum(RepostStrategy) strategy!: RepostStrategy;
}
