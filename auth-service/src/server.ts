import app from "./app";
import dotenv from "dotenv";
import logger from "./utils/logger";
import { dbConnect } from "./config/db.config";
import { redisConnect } from "./config/redis.config";
import { authMailProducer } from "./services/kafka.mail.producer";
import { disconnectKafkaProducer } from "./config/kafka.config";

dotenv.config();

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
    try {
        // Connect to MongoDB
        await dbConnect();

        // Connect to Redis
        await redisConnect();

        // Initialize Kafka producer
        await authMailProducer.initialize();
        logger.info("Kafka mail producer initialized");

        // Start Express server
        app.listen(PORT, () => {
            logger.info(`Auth service is running at port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start auth service", {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
        await disconnectKafkaProducer();
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
