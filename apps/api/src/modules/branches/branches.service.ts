import { Injectable, NotFoundException } from "@nestjs/common";
import { BranchDto, PropertyStatus, Region } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { UpsertBranchDto } from "./dto";

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  private async toDto(b: any): Promise<BranchDto> {
    const [userCount, activeListings] = await Promise.all([
      this.db.user.count({ where: { branchId: b.id } }),
      this.db.property.count({
        where: { branchId: b.id, status: PropertyStatus.ACTIVE_LISTING },
      }),
    ]);
    return {
      id: b.id,
      name: b.name,
      region: b.region as Region,
      address: b.address ?? null,
      userCount,
      activeListings,
      createdAt: b.createdAt.toISOString(),
    };
  }

  async list(): Promise<BranchDto[]> {
    const rows = await this.db.branch.findMany({
      orderBy: { createdAt: "asc" },
    });
    return Promise.all(rows.map((b) => this.toDto(b)));
  }

  async create(dto: UpsertBranchDto): Promise<BranchDto> {
    const { companyId } = TenantStore.require();
    const branch = await this.db.branch.create({
      data: {
        companyId: companyId!,
        name: dto.name,
        region: dto.region,
        address: dto.address,
      },
    });
    return this.toDto(branch);
  }

  async update(id: string, dto: UpsertBranchDto): Promise<BranchDto> {
    const exists = await this.db.branch.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Branch not found");
    const branch = await this.db.branch.update({
      where: { id },
      data: { name: dto.name, region: dto.region, address: dto.address },
    });
    return this.toDto(branch);
  }

  async remove(id: string): Promise<{ id: string }> {
    const exists = await this.db.branch.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Branch not found");
    await this.db.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }
}
