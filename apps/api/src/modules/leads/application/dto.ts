import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { LeadKind, LeadSource, LeadStatus, Region } from "@reos/shared";
import { PaginationQuery } from "../../../common/http/pagination";

export class CreateLeadDto {
  @IsEnum(LeadKind)
  kind!: LeadKind;

  @IsString()
  @MaxLength(160)
  fullName!: string;

  @IsString()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @IsEnum(Region)
  region?: Region;

  @IsOptional() @IsString() listingUrl?: string;
  @IsOptional() @IsString() listingPhotoUrl?: string;
  @IsOptional() @Type(() => Number) listingPrice?: number;
  @IsOptional() @IsString() listingRooms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class AssignLeadDto {
  @IsString()
  agentId!: string;
}

export class TransitionLeadDto {
  @IsEnum(LeadStatus)
  to!: LeadStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListLeadsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsEnum(LeadKind) kind?: LeadKind;
  @IsOptional() @IsEnum(Region) region?: Region;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minScore?: number;
  @IsOptional() @IsString() search?: string;
}
