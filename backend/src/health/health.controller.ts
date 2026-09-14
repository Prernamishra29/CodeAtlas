import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { redisConnection } from "../queue/queue.constants";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("live")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    const checks = { database: "error", redis: "error" };
    const redis = new Redis({ ...redisConnection(), maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true });
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
      await redis.connect();
      const pong = await redis.ping();
      if (pong === "PONG") checks.redis = "ok";
    } catch {
      /* reported via checks */
    } finally {
      redis.disconnect();
    }
    if (checks.database !== "ok" || checks.redis !== "ok") {
      throw new ServiceUnavailableException({ status: "error", checks });
    }
    return { status: "ok", checks };
  }

  @Get()
  async check() {
    const ready = await this.ready();
    return { ...ready, uptime: process.uptime() };
  }
}
