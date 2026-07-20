import { Injectable, NotFoundException } from "@nestjs/common";
import { LeadKind, LeadSource, Region, Role } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { LeadsService } from "../leads/application/leads.service";
import { InboundMessageDto, PublicLeadDto } from "./dto";

@Injectable()
export class PublicIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
  ) {}

  private async resolveCompany(slug: string): Promise<{ id: string }> {
    const company = await this.prisma.company.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  private runInTenant<T>(companyId: string, fn: () => Promise<T>): Promise<T> {
    return TenantStore.run(
      {
        companyId,
        branchId: null,
        userId: null,
        email: null,
        roles: [] as Role[],
        bypassTenant: false,
      },
      fn,
    );
  }

  async submitLead(
    slug: string,
    dto: PublicLeadDto,
  ): Promise<{ id: string; duplicate: boolean }> {
    const company = await this.resolveCompany(slug);
    return this.runInTenant(company.id, () =>
      this.leads.ingest({
        kind: LeadKind.BUYER,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        source: LeadSource.PORTAL,
        region: dto.region as Region | undefined,
        notes: dto.message,
        rawPayload: { via: "web_form", message: dto.message },
      }),
    );
  }

  async inbound(
    slug: string,
    dto: InboundMessageDto,
  ): Promise<{ id: string; duplicate: boolean }> {
    const company = await this.resolveCompany(slug);
    const source = mapChannelToSource(dto.channel);
    const result = await this.runInTenant(company.id, () =>
      this.leads.ingest({
        kind: LeadKind.BUYER,
        fullName: dto.name?.trim() || dto.from,
        phone: dto.from,
        source,
        notes: dto.text,
        rawPayload: {
          via: "inbound_webhook",
          channel: dto.channel ?? "unknown",
          text: dto.text,
        },
      }),
    );
    // Log the actual message content as an activity for context.
    if (dto.text) {
      await this.prisma.leadActivity.create({
        data: {
          companyId: company.id,
          leadId: result.id,
          type: "NOTE",
          message: `[${(dto.channel ?? "inbound").toUpperCase()}] ${dto.text}`,
        },
      });
    }
    return result;
  }
}

function mapChannelToSource(channel?: string): LeadSource {
  switch ((channel ?? "").toLowerCase()) {
    case "telegram":
      return LeadSource.TELEGRAM;
    case "instagram":
      return LeadSource.INSTAGRAM;
    case "facebook":
      return LeadSource.FACEBOOK;
    default:
      return LeadSource.PORTAL;
  }
}
