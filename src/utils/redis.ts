import type { Redis as IORedis } from "ioredis";

// Lazy import to avoid bundlers eagerly instantiating connections
let RedisCtor: any | null = null;

// Cache the client across hot-reloads in dev and across imports
const globalForRedis = globalThis as unknown as { __redis__: IORedis | undefined };

/**
 * Returns a singleton Redis client instance.
 * Connection is established on first call, not at module import time.
 */
export async function getRedis(): Promise<IORedis> {
  if (globalForRedis.__redis__) return globalForRedis.__redis__;

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set. Please configure it in your environment.");
  }

  if (!RedisCtor) {
    // Dynamically import to keep the module side-effect free until actually used
    const mod = await import("ioredis");
    RedisCtor = (mod as any).default ?? (mod as any);
  }

  const useTls = String(process.env.REDIS_TLS || "false").toLowerCase() === "true";

  const client: IORedis = new RedisCtor(process.env.REDIS_URL, {
    // Common stability options
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    tls: useTls ? {} : undefined,
  });

  // Basic error logging to help during development
  client.on("error", (err: unknown) => {
    console.error("Redis error:", err);
  });

  globalForRedis.__redis__ = client;
  return client;
}

export async function redisPing(): Promise<string> {
  const redis = await getRedis();
  return redis.ping();
}

export async function redisSetJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<"OK" | null> {
  const redis = await getRedis();
  const payload = JSON.stringify(value);
  if (ttlSeconds && ttlSeconds > 0) {
    return redis.set(key, payload, "EX", ttlSeconds);
  }
  return redis.set(key, payload);
}

export async function redisGetJSON<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export async function redisDel(key: string): Promise<number> {
  const redis = await getRedis();
  return redis.del(key);
}


