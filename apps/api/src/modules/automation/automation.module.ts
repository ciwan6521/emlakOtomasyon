import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { WorkersModule } from "../workers/workers.module";
import {
  AutomationEventHandlers,
  PipelineSyncHandler,
} from "./automation.handlers";
import { AutomationScheduler } from "./automation.scheduler";
import { CallbacksAutomationService } from "./callbacks-automation.service";
import { RentalsAutomationService } from "./rentals-automation.service";

@Module({
  imports: [ScheduleModule.forRoot(), WorkersModule],
  providers: [
    AutomationScheduler,
    RentalsAutomationService,
    CallbacksAutomationService,
    PipelineSyncHandler,
    AutomationEventHandlers,
  ],
})
export class AutomationModule {}
