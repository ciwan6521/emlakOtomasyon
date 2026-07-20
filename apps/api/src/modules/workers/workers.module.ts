import { Module } from "@nestjs/common";
import { AnalyticsRollupService } from "./analytics-rollup.service";
import { AnalyticsRollupWorker } from "./analytics-rollup.worker";
import { MediaProcessingWorker } from "./media-processing.worker";
import { ScoringWorker } from "./scoring.worker";

@Module({
  providers: [
    ScoringWorker,
    AnalyticsRollupWorker,
    AnalyticsRollupService,
    MediaProcessingWorker,
  ],
  exports: [AnalyticsRollupService],
})
export class WorkersModule {}
