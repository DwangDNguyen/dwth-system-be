import app from "./app";
import dotenv from "dotenv";
import logger from "./utils/logger";
import { dbConnect } from "./config/db.config";
import {
  startUserConsumer,
  disconnectUserConsumer,
} from "./config/kafka.config";
import { startLandingCronJob } from "./services/landing.service";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 6000;

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`User service is running at port ${PORT}`);
    });

    // Start Kafka consumer in background
    startUserConsumer().catch((error) => {
      logger.error("User consumer error", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Start landing page cron job — warms Redis cache immediately, refreshes every 30 min
    startLandingCronJob();

    logger.info("User service started with Kafka consumer and Landing cron job");
  } catch (error) {
    logger.error("Failed to start user service", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await disconnectUserConsumer();
    await mongoose.disconnect();
    logger.info("MongoDB connection closed successfully");
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
  logger.error("Uncaught exception", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: String(reason),
  });
});

startServer();
