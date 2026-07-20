import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Role } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { CreateUserDto, UpdateUserDto } from "./dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  private safe(u: any) {
    const { passwordHash: _omit, ...rest } = u;
    return rest;
  }

  async list() {
    const users = await this.db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { branch: { select: { id: true, name: true } } },
    });
    return users.map((u) => this.safe(u));
  }

  async create(dto: CreateUserDto) {
    const { companyId } = TenantStore.require();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.db.user.create({
      data: {
        companyId: companyId!,
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        roles: dto.roles as Role[],
        branchId: dto.branchId,
      },
    });
    return this.safe(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const exists = await this.db.user.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("User not found");
    const user = await this.db.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.roles !== undefined ? { roles: dto.roles as Role[] } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.password
          ? { passwordHash: await bcrypt.hash(dto.password, 12) }
          : {}),
      },
    });
    return this.safe(user);
  }

  async remove(id: string) {
    await this.db.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }
}
