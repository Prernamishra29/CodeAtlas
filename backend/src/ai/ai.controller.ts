import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AiService } from "./ai.service";
import { ChatDto } from "./dto/chat.dto";

@Controller("repositories/:id/chat")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get()
  getConversations(@CurrentUser() userId: string, @Param("id", ParseUUIDPipe) repositoryId: string) {
    return this.aiService.getConversations(userId, repositoryId);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async chat(
    @CurrentUser() userId: string,
    @Param("id", ParseUUIDPipe) repositoryId: string,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    try {
      await this.aiService.chatStream(userId, repositoryId, dto.question, dto.conversationId ?? null, res);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ message: "An unexpected error occurred." });
        return;
      }
      res.write(`data: ${JSON.stringify({ error: "The assistant could not complete that answer." })}\n\n`);
      res.end();
    }
  }
}
