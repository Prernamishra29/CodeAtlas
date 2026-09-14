import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Response } from "express";
import { chatModel, createLlmClient, hasLlmKey } from "./llm";
import { buildChatEvidence, INSUFFICIENT } from "./rag";
import { log } from "../common/logger";

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  private async assertOwned(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
      select: { id: true },
    });
    if (!repository) throw new NotFoundException("Repository not found.");
    return repository;
  }

  async getConversations(userId: string, repositoryId: string) {
    await this.assertOwned(userId, repositoryId);
    return this.prisma.conversation.findMany({
      where: { repositoryId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });
  }

  async chatStream(
    userId: string,
    repositoryId: string,
    question: string,
    conversationId: string | null,
    res: Response,
  ) {
    await this.assertOwned(userId, repositoryId);

    if (!hasLlmKey()) {
      res.write(`data: ${JSON.stringify({ error: "No Gemini or OpenAI API key is configured." })}\n\n`);
      res.end();
      return;
    }

    const trimmed = (question ?? "").trim();
    if (!trimmed) {
      res.write(`data: ${JSON.stringify({ error: "Ask a question about this repository." })}\n\n`);
      res.end();
      return;
    }

    let convId = conversationId;
    if (convId) {
      const owned = await this.prisma.conversation.findFirst({
        where: { id: convId, repositoryId },
        select: { id: true },
      });
      if (!owned) convId = null;
    }
    if (!convId) {
      const conv = await this.prisma.conversation.create({
        data: {
          repositoryId,
          title: trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : ""),
        },
      });
      convId = conv.id;
    }

    res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    await this.prisma.chatMessage.create({
      data: { conversationId: convId, role: "user", content: trimmed },
    });

    const evidence = await buildChatEvidence(this.prisma, repositoryId, trimmed);
    if (!evidence.sufficient) {
      res.write(`data: ${JSON.stringify({ content: INSUFFICIENT })}\n\n`);
      await this.finish(res, convId, INSUFFICIENT, []);
      return;
    }

    const client = createLlmClient();
    const model = chatModel();
    const systemPrompt = `You are CodeAtlas, an analysis layer over a parsed GitHub repository.
You must answer using ONLY the evidence below (metadata, symbols, dependencies, retrieved source, existing docs).
Do not invent files, functions, or behavior that are not in the evidence.
If the evidence is not enough, reply exactly with: ${INSUFFICIENT}

When you mention a file, cite it as a markdown link using the full repository path:
[src/auth/auth.service.ts](file:src/auth/auth.service.ts)

Evidence:
${evidence.context}`;

    const started = Date.now();
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: trimmed },
      ],
      stream: true,
    });

    let fullAnswer = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (!content) continue;
      fullAnswer += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    log("info", "ai.chat", {
      repositoryId,
      model,
      ms: Date.now() - started,
    });

    await this.finish(res, convId, fullAnswer || INSUFFICIENT, evidence.citations);
  }

  private async finish(res: Response, conversationId: string, answer: string, citations: string[]) {
    await this.prisma.chatMessage.create({
      data: { conversationId, role: "assistant", content: answer },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    res.write(`data: ${JSON.stringify({ citations })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
