import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { AiController } from "./ai.controller";
import { AiWorker } from "./ai.worker";

@Module({
  imports: [AnalyticsModule],
  controllers: [AiController],
  providers: [AiWorker],
})
export class AiModule {}
