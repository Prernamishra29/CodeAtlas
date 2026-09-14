import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalysisService } from "../analysis/analysis.service";
import { CreateRepositoryDto } from "./dto/create-repository.dto";
import { RepositoriesService } from "./repositories.service";

@Controller("repositories")
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  constructor(
    private readonly repositories: RepositoriesService,
    private readonly analysis: AnalysisService,
  ) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.repositories.list(userId);
  }

  @Get("activity")
  activity(@CurrentUser() userId: string) {
    return this.repositories.activity(userId);
  }

  @Get("insights")
  insights(@CurrentUser() userId: string) {
    return this.repositories.insights(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateRepositoryDto) {
    return this.repositories.create(userId, dto);
  }

  @Get(":id")
  get(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.get(userId, id);
  }

  @Delete(":id")
  remove(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.remove(userId, id);
  }

  @HttpCode(202)
  @Post(":id/analyze")
  analyze(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.analysis.start(userId, id);
  }

  @HttpCode(202)
  @Post(":id/retry")
  retry(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.analysis.start(userId, id, { force: true });
  }

  @Get(":id/files")
  getFiles(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.getFiles(userId, id);
  }

  @Get(":id/dependencies")
  getDependencies(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.getDependencies(userId, id);
  }

  @Get(":id/health")
  getHealth(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.getHealth(userId, id);
  }

  @Get(":id/search")
  search(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("q") q = "",
    @Query("kinds") kinds?: string,
  ) {
    const parsed = kinds ? kinds.split(",").map((item) => item.trim()).filter(Boolean) : [];
    return this.repositories.search(userId, id, q, parsed);
  }

  @Get(":id/documentation")
  documentation(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.getDocumentation(userId, id);
  }

  @Get(":id/insights")
  repoInsights(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.repositories.insights(userId, id);
  }
}
