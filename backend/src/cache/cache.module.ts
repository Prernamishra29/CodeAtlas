import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { redisConnection } from "../queue/queue.constants";
import { log } from "../common/logger";
import { repoCacheKeys } from "./cache.keys";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis = new Redis({
    ...redisConnection(),
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });

  ping() {
    return this.redis.ping();
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      log("warn", "cache.set_failed", { key, err: error instanceof Error ? error.name : "unknown" });
    }
  }

  async del(...keys: string[]) {
    if (!keys.length) return;
    try {
      await this.redis.del(...keys);
    } catch (error) {
      log("warn", "cache.del_failed", { err: error instanceof Error ? error.name : "unknown" });
    }
  }

  async wrap<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const hit = await this.getJson<T>(key);
    if (hit !== undefined) return hit;
    const value = await load();
    await this.setJson(key, value, ttlSeconds);
    return value;
  }

  invalidateUser(userId: string, repoId?: string) {
    return this.del(...repoCacheKeys(userId, repoId));
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
