import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permission, Scope } from "@reos/shared";
import { RequirePermissions } from "../../common/auth/decorators";
import { DocumentsService } from "./documents.service";
import {
  ChangeDocumentStatusDto,
  CreateDocumentDto,
  ListDocumentsQuery,
  PresignDocumentDto,
  SignDocumentDto,
} from "./dto";

@ApiTags("documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @RequirePermissions({
    permission: Permission.DOCUMENT_VIEW,
    scope: Scope.OWN,
  })
  list(@Query() query: ListDocumentsQuery) {
    return this.documents.list(query);
  }

  @Post("presign")
  @RequirePermissions({
    permission: Permission.DOCUMENT_MANAGE,
    scope: Scope.OWN,
  })
  presign(@Body() dto: PresignDocumentDto) {
    return this.documents.presign(dto);
  }

  @Post()
  @RequirePermissions({
    permission: Permission.DOCUMENT_MANAGE,
    scope: Scope.OWN,
  })
  create(@Body() dto: CreateDocumentDto) {
    return this.documents.create(dto);
  }

  @Get(":id")
  @RequirePermissions({
    permission: Permission.DOCUMENT_VIEW,
    scope: Scope.OWN,
  })
  get(@Param("id") id: string) {
    return this.documents.get(id);
  }

  @Post(":id/sign")
  @RequirePermissions({
    permission: Permission.DOCUMENT_MANAGE,
    scope: Scope.OWN,
  })
  sign(@Param("id") id: string, @Body() dto: SignDocumentDto) {
    return this.documents.sign(id, dto);
  }

  @Post(":id/status")
  @RequirePermissions({
    permission: Permission.DOCUMENT_MANAGE,
    scope: Scope.OWN,
  })
  changeStatus(@Param("id") id: string, @Body() dto: ChangeDocumentStatusDto) {
    return this.documents.changeStatus(id, dto);
  }

  @Delete(":id")
  @RequirePermissions({
    permission: Permission.DOCUMENT_MANAGE,
    scope: Scope.OWN,
  })
  remove(@Param("id") id: string) {
    return this.documents.remove(id);
  }
}
