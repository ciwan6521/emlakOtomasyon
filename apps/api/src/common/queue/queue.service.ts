import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Processor } from "bullmq";
import Redis from "ioredis";
import { QueueName } from "@reos/shared";
import { REDIS_CLIENT } from "./redis.provider";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];

  constructor(@Inject(REDIS_CLIENT) private readonly connection: Redis) {}

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.connection as never,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.queues.set(name, q);
    }
    return q;
  }

  async enqueue<T extends object>(
    name: QueueName,
    jobName: string,
    data: T,
  ): Promise<void> {
    await this.queue(name).add(jobName, data);
  }

  registerWorker<T = unknown>(
    name: QueueName,
    processor: Processor<T>,
  ): Worker<T> {
    const worker = new Worker<T>(name, processor, {
      connection: this.connection as never,
      concurrency: 5,
    });
    worker.on("failed", (job, err) =>
      this.logger.error(`[${name}] job ${job?.id} failed: ${err.message}`),
    );
    this.workers.push(worker as unknown as Worker);
    return worker;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
