import { Global, Module } from "@nestjs/common";
import { AiAdapter } from "./ai.adapter";
import { MessagingAdapter } from "./messaging.adapter";
import { SocialAdapter } from "./social.adapter";

@Global()
@Module({
  providers: [MessagingAdapter, SocialAdapter, AiAdapter],
  exports: [MessagingAdapter, SocialAdapter, AiAdapter],
})
export class IntegrationsModule {}
