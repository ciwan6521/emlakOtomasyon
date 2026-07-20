import { Module } from "@nestjs/common";
import { CallCenterController } from "./call-center.controller";
import { CallCenterService } from "./call-center.service";

@Module({
  controllers: [CallCenterController],
  providers: [CallCenterService],
  exports: [CallCenterService],
})
export class CallCenterModule {}
