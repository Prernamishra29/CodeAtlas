import type { PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { sendMail } from "../common/mail";
import { log } from "../common/logger";

export type NotificationType = "analysis_completed" | "analysis_failed" | "insights_ready";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    try {
      return await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          repositoryId: true,
          readAt: true,
          createdAt: true,
        },
      });
    } catch {
      return [];
    }
  }

  async unreadCount(userId: string) {
    try {
      return await this.prisma.notification.count({ where: { userId, readAt: null } });
    } catch {
      return 0;
    }
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}

export async function recordUserNotification(
  prisma: Pick<PrismaClient, "user" | "notification">,
  input: {
    userId: string;
    repositoryId?: string;
    type: NotificationType;
    title: string;
    body: string;
    email?: { subject: string; text: string };
    preferEmail: boolean;
  },
) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      repositoryId: input.repositoryId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
    },
  });

  if (!input.preferEmail || !input.email) return;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });
  if (!user?.email) return;
  try {
    await sendMail({ to: user.email, subject: input.email.subject, text: input.email.text });
  } catch (error) {
    log("warn", "notification.email_failed", { err: error instanceof Error ? error.name : "unknown" });
  }
}
