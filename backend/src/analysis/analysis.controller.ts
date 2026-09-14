import { Controller, Delete, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalysisService } from "./analysis.service";

@Controller("repositories/:id/analyses")
@UseGuards(JwtAuthGuard)
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get()
  list(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.analysis.list(userId, id);
  }

  @Get("latest")
  latest(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.analysis.latest(userId, id);
  }

  @Delete(":analysisId")
  cancel(
    @CurrentUser() userId: string,
    @Param("analysisId", ParseUUIDPipe) analysisId: string,
  ) {
    return this.analysis.cancel(userId, analysisId);
  }
}
