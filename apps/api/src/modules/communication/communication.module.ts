import { Module } from "@nestjs/common";
import { CommunicationController } from "./communication.controller";
import { CommunicationService } from "./communication.service";
import { CommunicationWorker } from "./communication.worker";

@Module({
  controllers: [CommunicationController],
  providers: [CommunicationService, CommunicationWorker],
  exports: [CommunicationService],
})
export class CommunicationModule {}
