import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db.config";
import { initRedis, redisClient } from "./config/redis.config";
import { seedInitialMenus } from "./seeders/menu.seeder";
import logger from "./utils/logger";
import mongoose from "mongoose";

const PORT = process.env.PORT || 6001;

async function startServer(): Promise<void> {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis (non-blocking)
    await initRedis();

    // 3. Auto-seed initial menus if collection is empty
    await seedInitialMenus();

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      logger.info(`System service is running at port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start system service", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down system service...`);
  try {
    await mongoose.disconnect();
    if (redisClient.status === "ready") {
      await redisClient.quit();
    }
    logger.info("System service gracefully terminated");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception in system service", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection in system service", { reason: String(reason) });
});

startServer();
