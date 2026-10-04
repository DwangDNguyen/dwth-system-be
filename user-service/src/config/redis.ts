import Redis from "ioredis";
import logger from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
});

redisClient.on("connect", () => {
    logger.info("Redis connected successfully", { url: REDIS_URL });
});

redisClient.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
});

export default redisClient;
