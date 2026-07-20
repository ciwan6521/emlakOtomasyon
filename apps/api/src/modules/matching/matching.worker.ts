import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { QueueName } from "@reos/shared";
import { QueueService } from "../../common/queue/queue.service";
import { MatchingService } from "./matching.service";

@Injectable()
export class MatchingWorker implements OnModuleInit {
  private readonly logger = new Logger(MatchingWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly matching: MatchingService,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{
      companyId: string;
      propertyId?: string;
      customerId?: string;
    }>(QueueName.MATCHING, async (job) => {
      const { companyId, propertyId, customerId } = job.data;
      if (propertyId)
        await this.matching.matchForProperty(companyId, propertyId);
      if (customerId)
        await this.matching.matchForCustomer(companyId, customerId);
    });
    this.logger.log("Matching worker registered");
  }
}
