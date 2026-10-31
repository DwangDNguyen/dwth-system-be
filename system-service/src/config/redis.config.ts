import Redis from "ioredis";
import logger from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
});

redisClient.on("connect", () => {
  logger.info("System service connected to Redis successfully", { url: REDIS_URL });
});

redisClient.on("error", (err) => {
  logger.warn("Redis connection warning/error (falling back to database if needed)", {
    error: err.message,
  });
});

export const initRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn("Could not connect to Redis initially, will retry in background", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
