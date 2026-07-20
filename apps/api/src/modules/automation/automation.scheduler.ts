import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { QueueName } from "@reos/shared";
import { QueueService } from "../../common/queue/queue.service";
import { CallbacksAutomationService } from "./callbacks-automation.service";
import { RentalsAutomationService } from "./rentals-automation.service";

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private readonly rentals: RentalsAutomationService,
    private readonly callbacks: CallbacksAutomationService,
    private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runRentalJobs(): Promise<void> {
    try {
      await this.rentals.processOverduePayments();
      await this.rentals.processRentDueReminders();
      await this.rentals.processLeaseExpiring();
    } catch (err) {
      this.logger.error("Rental automation failed", err);
    }
  }

  @Cron("*/15 * * * *")
  async runCallbackJobs(): Promise<void> {
    try {
      await this.callbacks.processDueCallbacks();
    } catch (err) {
      this.logger.error("Callback automation failed", err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runAnalyticsRollup(): Promise<void> {
    try {
      await this.queue.enqueue(QueueName.ANALYTICS_ROLLUP, "daily", {});
    } catch (err) {
      this.logger.error("Analytics rollup enqueue failed", err);
    }
  }
}
