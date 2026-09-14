import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AnalysisController } from "./analysis.controller";
import { AnalysisService } from "./analysis.service";
import { ANALYSIS_QUEUE } from "../queue/queue.constants";

@Module({
  imports: [BullModule.registerQueue({ name: ANALYSIS_QUEUE })],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
