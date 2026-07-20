import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { DocumentStatus, DocumentType } from "@reos/shared";
import { PaginationQuery } from "../../common/http/pagination";

export class PresignDocumentDto {
  @IsString() @MaxLength(260) filename!: string;
  @IsString() @MaxLength(160) contentType!: string;
}

export class CreateDocumentDto {
  @IsString() @MaxLength(260) name!: string;
  @IsString() url!: string;
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsOptional() @IsString() @MaxLength(160) mimeType?: string;
  @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() customerId?: string;
}

export class SignDocumentDto {
  @IsOptional() @IsString() @MaxLength(160) signerName?: string;
}

export class ChangeDocumentStatusDto {
  @IsEnum(DocumentStatus) status!: DocumentStatus;
}

export class ListDocumentsQuery extends PaginationQuery {
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsOptional() @IsEnum(DocumentStatus) status?: DocumentStatus;
  @IsOptional() @IsString() propertyId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() customerId?: string;
}
