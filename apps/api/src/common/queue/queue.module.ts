import { Global, Module } from "@nestjs/common";
import { RedisModule } from "./redis.provider";
import { QueueService } from "./queue.service";

@Global()
@Module({
  imports: [RedisModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
