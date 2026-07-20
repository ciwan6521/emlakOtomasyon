import { Module } from "@nestjs/common";
import { CallAssistController } from "./call-assist.controller";
import { CallAssistService } from "./call-assist.service";

@Module({
  controllers: [CallAssistController],
  providers: [CallAssistService],
})
export class CallAssistModule {}
