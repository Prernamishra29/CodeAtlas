import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ANALYSIS_DLQ, ANALYSIS_QUEUE, defaultJobOptions, redisConnection } from "./queue.constants";

/**
 * Producer side of the analysis pipeline. The API only ever enqueues; all
 * repository work happens in the separate worker process.
 */
@Global()
@Module({
  imports: [
    BullModule.forRoot({ connection: redisConnection() }),
    BullModule.registerQueue(
      { name: ANALYSIS_QUEUE, defaultJobOptions },
      { name: ANALYSIS_DLQ, defaultJobOptions: { attempts: 1, removeOnComplete: false } },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
