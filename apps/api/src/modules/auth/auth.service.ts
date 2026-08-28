import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Locale, LoginResponse, Role } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { JwtPayload } from "../../common/auth/jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async login(
    email: string,
    password: string,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    // Auth bypasses tenant scoping (login happens before tenant context exists).
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      branchId: user.branchId,
      roles: user.roles as Role[],
    });

    await this.persistRefreshToken(user.id, tokens.refreshToken, ip, userAgent);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        companyId: user.companyId,
        branchId: user.branchId,
        roles: user.roles as Role[],
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Rotate: revoke old, issue new.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await this.issueTokens({
      sub: stored.user.id,
      email: stored.user.email,
      companyId: stored.user.companyId,
      branchId: stored.user.branchId,
      roles: stored.user.roles as Role[],
    });
    await this.persistRefreshToken(stored.user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyId: true,
        branchId: true,
        roles: true,
        avatarUrl: true,
        locale: true,
      },
    });
  }

  /** Personal UI language, overriding the company default for this user only. */
  async updateLocale(userId: string, locale: Locale) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: { id: true, locale: true },
    });
    return user;
  }

  private async issueTokens(payload: JwtPayload) {
    const accessTtl = this.config.get<number>("jwt.accessTtl")!;
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: accessTtl,
    });
    const refreshToken = randomBytes(48).toString("hex");
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    const ttl = this.config.get<number>("jwt.refreshTtl")!;
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttl * 1000),
        ip,
        userAgent,
      },
    });
  }
}
