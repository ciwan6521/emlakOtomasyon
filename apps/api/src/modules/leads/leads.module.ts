import { Module } from "@nestjs/common";
import { LeadsService } from "./application/leads.service";
import { LeadsWorkers } from "./infrastructure/leads.workers";
import { LeadsController } from "./presentation/leads.controller";

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadsWorkers],
  exports: [LeadsService],
})
export class LeadsModule {}
