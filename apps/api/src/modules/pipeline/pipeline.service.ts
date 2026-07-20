import { Injectable, NotFoundException } from "@nestjs/common";
import { DealDto, DealStage, DomainEvent } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EventBus } from "../../common/events/event-bus";
import { TenantStore } from "../../common/tenant/tenant-context";
import { CreateDealDto, MoveStageDto } from "./dto";

const STAGE_PROBABILITY: Record<DealStage, number> = {
  [DealStage.LEAD]: 10,
  [DealStage.CONTACTED]: 20,
  [DealStage.QUALIFIED]: 35,
  [DealStage.OWNER_ACCEPTED]: 45,
  [DealStage.LISTING_CREATED]: 55,
  [DealStage.PUBLISHED]: 65,
  [DealStage.BUYER_INTERESTED]: 75,
  [DealStage.OFFER]: 85,
  [DealStage.DEAL_CLOSED]: 100,
  [DealStage.LOST]: 0,
};

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBus,
  ) {}

  private get db() {
    return this.prisma.scoped;
  }

  private toDto(d: any): DealDto {
    return {
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: Number(d.value),
      currency: d.currency,
      propertyId: d.propertyId,
      customerId: d.customerId,
      ownerId: d.ownerId,
      probability: d.probability,
      createdAt: d.createdAt.toISOString(),
    };
  }

  async create(dto: CreateDealDto): Promise<DealDto> {
    const { companyId, branchId, userId } = TenantStore.require();
    const d = await this.db.deal.create({
      data: {
        companyId: companyId!,
        title: dto.title,
        value: dto.value ?? 0,
        stage: dto.stage ?? DealStage.LEAD,
        probability: STAGE_PROBABILITY[dto.stage ?? DealStage.LEAD],
        propertyId: dto.propertyId,
        customerId: dto.customerId,
        ownerId: userId,
        branchId,
      },
    });
    return this.toDto(d);
  }

  async board(): Promise<Record<DealStage, DealDto[]>> {
    const deals = await this.db.deal.findMany({
      orderBy: { updatedAt: "desc" },
    });
    const board = Object.fromEntries(
      Object.values(DealStage).map((s) => [s, []]),
    ) as unknown as Record<DealStage, DealDto[]>;
    for (const d of deals) board[d.stage as DealStage].push(this.toDto(d));
    return board;
  }

  async moveStage(id: string, dto: MoveStageDto): Promise<DealDto> {
    const { companyId, branchId } = TenantStore.require();
    const current = await this.db.deal.findFirst({ where: { id } });
    if (!current) throw new NotFoundException("Deal not found");

    const closing = dto.stage === DealStage.DEAL_CLOSED;
    const d = await this.db.deal.update({
      where: { id },
      data: {
        stage: dto.stage,
        probability: STAGE_PROBABILITY[dto.stage],
        ...(closing ? { closedAt: new Date() } : {}),
      },
    });

    this.events.publish(DomainEvent.DEAL_STAGE_CHANGED, {
      companyId,
      branchId,
      dealId: id,
      from: current.stage,
      to: dto.stage,
      occurredAt: new Date().toISOString(),
    });
    if (closing) {
      this.events.publish(DomainEvent.DEAL_CLOSED, {
        companyId,
        branchId,
        dealId: id,
        from: current.stage,
        to: dto.stage,
        value: Number(d.value),
        occurredAt: new Date().toISOString(),
      });
    }
    return this.toDto(d);
  }
}
