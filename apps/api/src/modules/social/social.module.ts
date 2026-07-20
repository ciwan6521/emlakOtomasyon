import { Module } from "@nestjs/common";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { SocialWorker } from "./social.worker";

@Module({
  controllers: [SocialController],
  providers: [SocialService, SocialWorker],
  exports: [SocialService],
})
export class SocialModule {}
