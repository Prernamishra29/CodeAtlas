import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.notifications.list(userId);
  }

  @Get("unread-count")
  async unread(@CurrentUser() userId: string) {
    return { count: await this.notifications.unreadCount(userId) };
  }

  @Post("read-all")
  markAll(@CurrentUser() userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post(":id/read")
  markOne(@CurrentUser() userId: string, @Param("id") id: string) {
    return this.notifications.markRead(userId, id);
  }
}
