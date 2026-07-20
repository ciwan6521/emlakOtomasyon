import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DocumentDto,
  DocumentStatus,
  DomainEvent,
  Paginated,
} from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { StorageService } from "../../common/storage/storage.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { paginate } from "../../common/http/pagination";
import {
  ChangeDocumentStatusDto,
  CreateDocumentDto,
  ListDocumentsQuery,
  PresignDocumentDto,
  SignDocumentDto,
} from "./dto";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
    private readonly storage: StorageService,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private toDto(d: any): DocumentDto {
    return {
      id: d.id,
      type: d.type,
      status: d.status,
      name: d.name,
      url: d.url,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      propertyId: d.propertyId,
      dealId: d.dealId,
      customerId: d.customerId,
      signerName: d.signerName,
      signedAt: d.signedAt ? d.signedAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    };
  }

  presign(dto: PresignDocumentDto) {
    const { companyId } = TenantStore.require();
    return this.storage.presignUpload({
      prefix: `documents/${companyId}`,
      filename: dto.filename,
      contentType: dto.contentType,
    });
  }

  async create(dto: CreateDocumentDto): Promise<DocumentDto> {
    const { companyId, userId } = TenantStore.require();
    const doc = await this.db.document.create({
      data: {
        companyId: companyId!,
        name: dto.name,
        url: dto.url,
        type: (dto.type ?? "OTHER") as never,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        propertyId: dto.propertyId,
        dealId: dto.dealId,
        customerId: dto.customerId,
        uploadedById: userId,
      },
    });
    this.events.publish(DomainEvent.DOCUMENT_CREATED, {
      companyId: companyId!,
      documentId: doc.id,
      occurredAt: new Date().toISOString(),
    });
    return this.toDto(doc);
  }

  async list(query: ListDocumentsQuery): Promise<Paginated<DocumentDto>> {
    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.dealId) where.dealId = query.dealId;
    if (query.customerId) where.customerId = query.customerId;

    const [rows, total] = await Promise.all([
      this.db.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.db.document.count({ where }),
    ]);
    return paginate(
      rows.map((r) => this.toDto(r)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string): Promise<DocumentDto> {
    const doc = await this.db.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException("Document not found");
    return this.toDto(doc);
  }

  async sign(id: string, dto: SignDocumentDto): Promise<DocumentDto> {
    await this.ensureExists(id);
    const doc = await this.db.document.update({
      where: { id },
      data: {
        status: DocumentStatus.SIGNED as never,
        signedAt: new Date(),
        signerName: dto.signerName,
      },
    });
    return this.toDto(doc);
  }

  async changeStatus(
    id: string,
    dto: ChangeDocumentStatusDto,
  ): Promise<DocumentDto> {
    await this.ensureExists(id);
    const doc = await this.db.document.update({
      where: { id },
      data: { status: dto.status as never },
    });
    return this.toDto(doc);
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.ensureExists(id);
    await this.db.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.db.document.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Document not found");
  }
}
