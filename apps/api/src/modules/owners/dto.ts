import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

import { OwnerRating } from "@reos/shared";

import { PaginationQuery } from "../../common/http/pagination";

export class AddConversationDto {
  @IsString() @MaxLength(40) ownerPhone!: string;

  @IsString() @MaxLength(40) channel!: string;

  @IsString() @MaxLength(2000) message!: string;
}

export class UpsertOwnerDto {
  @IsString() @MaxLength(160) name!: string;

  @IsString() @MaxLength(40) phone!: string;

  @IsOptional() @IsString() @MaxLength(160) email?: string;

  @IsOptional() @IsString() @MaxLength(40) whatsapp?: string;

  @IsOptional() @IsString() @MaxLength(120) telegram?: string;

  @IsOptional() @IsString() @MaxLength(300) address?: string;

  @IsOptional() @IsEnum(OwnerRating) rating?: OwnerRating;

  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ListOwnersQuery extends PaginationQuery {
  @IsOptional() @IsEnum(OwnerRating) rating?: OwnerRating;

  @IsOptional() @IsString() search?: string;
}
