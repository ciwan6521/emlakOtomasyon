import { Injectable, NotFoundException } from "@nestjs/common";
import { CompanySettingsDto } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { UpdateCompanyDto } from "./dto";

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(c: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    currency: string;
    locale: string;
    isActive: boolean;
    settings: unknown;
    createdAt: Date;
  }) {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl ?? null,
      currency: c.currency,
      locale: c.locale,
      settings: (c.settings ?? {}) as CompanySettingsDto,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async get() {
    const companyId = TenantStore.companyId();
    const company = await this.prisma.company.findFirst({
      where: { id: companyId! },
    });
    if (!company) throw new NotFoundException("Company not found");
    return this.toDto(company);
  }

  async update(dto: UpdateCompanyDto) {
    const companyId = TenantStore.companyId();
    const existing = await this.prisma.company.findFirst({
      where: { id: companyId! },
      select: { settings: true },
    });
    const mergedSettings = dto.settings
      ? { ...((existing?.settings ?? {}) as object), ...dto.settings }
      : undefined;

    const company = await this.prisma.company.update({
      where: { id: companyId! },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(mergedSettings !== undefined ? { settings: mergedSettings } : {}),
      },
    });
    return this.toDto(company);
  }
}
