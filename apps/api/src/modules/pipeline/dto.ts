import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { DealStage } from "@reos/shared";

export class CreateDealDto {
  @IsString() @MaxLength(200) title!: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsEnum(DealStage) stage?: DealStage;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() customerId?: string;
}

export class MoveStageDto {
  @IsEnum(DealStage) stage!: DealStage;
}
