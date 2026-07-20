import { Injectable, NotFoundException } from "@nestjs/common";
import { RepostStrategy, SocialChannel, SocialPostStatus } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TenantStore } from "../../common/tenant/tenant-context";
import { CreatePostDto, RepostDto } from "./dto";

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.scoped;
  }

  list() {
    return this.db.socialPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async create(dto: CreatePostDto) {
    const { companyId, branchId } = TenantStore.require();
    return this.db.socialPost.create({
      data: {
        companyId: companyId!,
        propertyId: dto.propertyId,
        channels: dto.channels,
        caption: dto.caption,
        mediaUrls: dto.mediaUrls ?? [],
        scheduleAt: dto.scheduleAt ? new Date(dto.scheduleAt) : null,
        status: dto.scheduleAt
          ? SocialPostStatus.SCHEDULED
          : SocialPostStatus.DRAFT,
        branchId,
      },
    });
  }

  async repost(id: string, dto: RepostDto) {
    const { companyId, branchId } = TenantStore.require();
    const original = await this.db.socialPost.findFirst({ where: { id } });
    if (!original) throw new NotFoundException("Post not found");

    const delayMs =
      dto.strategy === RepostStrategy.D7
        ? 7 * 86400_000
        : dto.strategy === RepostStrategy.D1
          ? 86400_000
          : 0;
    const caption =
      dto.strategy === RepostStrategy.PRICE_UPDATE
        ? `PRICE UPDATE\n\n${original.caption}`
        : original.caption;

    return this.db.socialPost.create({
      data: {
        companyId: companyId!,
        propertyId: original.propertyId,
        channels: original.channels as SocialChannel[],
        caption,
        mediaUrls: original.mediaUrls,
        repostOfId: original.id,
        repostStrategy: dto.strategy,
        scheduleAt: new Date(Date.now() + delayMs),
        status: SocialPostStatus.SCHEDULED,
        branchId,
      },
    });
  }
}
