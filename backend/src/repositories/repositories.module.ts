import { Module } from "@nestjs/common";
import { AnalysisModule } from "../analysis/analysis.module";
import { RepositoriesController } from "./repositories.controller";
import { RepositoriesService } from "./repositories.service";

@Module({
  imports: [AnalysisModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
