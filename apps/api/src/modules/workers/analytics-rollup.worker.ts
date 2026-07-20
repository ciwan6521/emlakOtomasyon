import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { QueueName } from "@reos/shared";
import { QueueService } from "../../common/queue/queue.service";
import { AnalyticsRollupService } from "./analytics-rollup.service";

@Injectable()
export class AnalyticsRollupWorker implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsRollupWorker.name);

  constructor(
    private readonly queue: QueueService,
    private readonly rollup: AnalyticsRollupService,
  ) {}

  onModuleInit(): void {
    this.queue.registerWorker<{ companyId?: string }>(
      QueueName.ANALYTICS_ROLLUP,
      async (job) => {
        if (job.data.companyId) {
          await this.rollup.rollupCompany(job.data.companyId);
        } else {
          await this.rollup.rollupAllCompanies();
        }
      },
    );
    this.logger.log("Analytics rollup worker registered");
  }
}
