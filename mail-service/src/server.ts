import app from "./app";
import dotenv from "dotenv";
import logger from "./utils/logger";
import { startMailConsumer, disconnectMailConsumer } from "./config/kafka.config";

dotenv.config();

const PORT = process.env.PORT || 3002;

async function startServer(): Promise<void> {
    try {
        // Start Express server
        app.listen(PORT, () => {
            logger.info(`Mail service is running at port ${PORT}`);
        });

        // Start Kafka consumer in background
        startMailConsumer().catch((error) => {
            logger.error("Mail consumer error", {
                error: error instanceof Error ? error.message : String(error),
            });
            // Continue running - HTTP endpoint still works
        });

        logger.info("Mail service started with Kafka consumer");
    } catch (error) {
        logger.error("Failed to start mail service", {
            error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
    }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
        await disconnectMailConsumer();
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
    logger.error("Unhandled rejection", { reason: String(reason) });
});

startServer();
