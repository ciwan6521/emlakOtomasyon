import { Module } from "@nestjs/common";

import { StorageModule } from "../../common/storage/storage.module";

import { OnboardingController } from "./onboarding.controller";

import { OnboardingService } from "./onboarding.service";

@Module({
  imports: [StorageModule],

  controllers: [OnboardingController],

  providers: [OnboardingService],

  exports: [OnboardingService],
})
export class OnboardingModule {}
