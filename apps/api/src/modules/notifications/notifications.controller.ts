import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query("unread") unread?: string) {
    return this.notifications.list(unread === "true");
  }

  @Get("count")
  count() {
    return this.notifications.unreadCount();
  }

  @Post(":id/read")
  read(@Param("id") id: string) {
    return this.notifications.markRead(id);
  }

  @Post("read-all")
  readAll() {
    return this.notifications.markAllRead();
  }
}
