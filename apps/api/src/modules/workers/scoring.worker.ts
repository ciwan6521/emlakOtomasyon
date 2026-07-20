import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { LeadSource, QueueName, Region } from "@reos/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { QueueService } from "../../common/queue/queue.service";
import { scoreLead } from "../leads/domain/lead-scoring";

@Injectable()
export class ScoringWorker implements OnModuleInit {
  private readonly logger = new Logger(ScoringWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{ companyId: string; leadId: string }>(
      QueueName.SCORING,
      async (job) => {
        const { companyId, leadId } = job.data;
        const lead = await this.prisma.lead.findFirst({
          where: { id: leadId, companyId, deletedAt: null },
        });
        if (!lead) return;

        const score = scoreLead({
          source: lead.source as LeadSource,
          phone: lead.phone,
          email: lead.email ?? undefined,
          region: lead.region as Region | undefined,
          rawPayload: lead.rawPayload as Record<string, unknown> | undefined,
        });

        if (score !== lead.score) {
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { score },
          });
          await this.prisma.leadActivity.create({
            data: {
              companyId,
              leadId,
              type: "SYSTEM",
              message: `Score updated: ${lead.score} → ${score}`,
            },
          });
        }
      },
    );
    this.logger.log("Scoring worker registered");
  }
}
