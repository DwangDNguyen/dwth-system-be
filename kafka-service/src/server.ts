/**
 * Kafka Service Server
 * Starts all consumers and manages Kafka lifecycle
 */

import dotenv from "dotenv";
import logger from "./utils/logger";
import { mailConsumer } from "./consumers/mail.consumer";
import { disconnectKafka } from "./config/kafka.config";

dotenv.config();

const PORT = process.env.PORT || 3003;
const NODE_ENV = process.env.NODE_ENV || "development";

// ─── Initialize Service ───────────────────────────────────────────────────────

import http from "http";

async function startKafkaService(): Promise<void> {
    try {
        logger.info("Starting Kafka Service", {
            environment: NODE_ENV,
            kafkaBroker: process.env.KAFKA_BROKER || "localhost:9092",
        });

        // Initialize and start mail consumer
        logger.info("Initializing mail consumer...");
        await mailConsumer.initialize();
        mailConsumer.startConsuming().catch((error) => {
            logger.error("Mail consumer error", {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });

        // Start a lightweight native HTTP server for health checks
        const healthServer = http.createServer((req, res) => {
            if (req.url === "/health" && req.method === "GET") {
                const memoryUsage = process.memoryUsage();
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    service: "kafka-service",
                    status: "UP",
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: {
                        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
                    }
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        healthServer.listen(PORT, () => {
            logger.info(`Kafka Service health check running at port ${PORT}`);
        });

        logger.info(`Kafka Service is running`, {
            port: PORT,
            environment: NODE_ENV,
        });
    } catch (error) {
        logger.error("Failed to start Kafka Service", {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
    }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
        // Disconnect consumers
        await mailConsumer.disconnect();

        // Disconnect Kafka
        await disconnectKafka();

        logger.info("Kafka Service stopped gracefully");
        process.exit(0);
    } catch (error) {
        logger.error("Error during graceful shutdown", {
            signal,
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
    process.exit(1);
});

// ─── Start Service ────────────────────────────────────────────────────────────

startKafkaService();
