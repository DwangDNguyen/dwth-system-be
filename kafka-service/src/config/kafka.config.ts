/**
 * Kafka client configuration
 * Singleton pattern to manage Kafka client lifecycle
 */

import { Kafka, logLevel, Admin, Producer, Consumer } from "kafkajs";
import dotenv from "dotenv";
import logger from "../utils/logger";

dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "kafka-service";
const KAFKA_LOG_LEVEL = process.env.KAFKA_LOG_LEVEL || "info";
const KAFKA_SASL_USERNAME = process.env.KAFKA_SASL_USERNAME || "";
const KAFKA_SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD || "";
const KAFKA_SASL_MECHANISM = process.env.KAFKA_SASL_MECHANISM || "scram-sha-256";
const KAFKA_SSL = process.env.KAFKA_SSL === "true";

// ─── Kafka Instance Singleton ──────────────────────────────────────────────────

let kafkaInstance: Kafka | null = null;
let adminInstance: Admin | null = null;
let producerInstance: Producer | null = null;

/**
 * Get or create Kafka client
 */
export const getKafkaInstance = (): Kafka => {
    if (!kafkaInstance) {
        kafkaInstance = new Kafka({
            clientId: KAFKA_CLIENT_ID,
            brokers: KAFKA_BROKER.split(","),
            logLevel: getKafkaLogLevel(KAFKA_LOG_LEVEL),
            connectionTimeout: 10000,
            requestTimeout: 25000,
            ssl: KAFKA_SSL ? true : undefined,
            sasl: KAFKA_SASL_USERNAME && KAFKA_SASL_PASSWORD ? {
                mechanism: KAFKA_SASL_MECHANISM as any,
                username: KAFKA_SASL_USERNAME,
                password: KAFKA_SASL_PASSWORD,
            } : undefined,
            retry: {
                initialRetryTime: 100,
                retries: 8,
                maxRetryTime: 30000,
                multiplier: 2,
            },
        });

        logger.info("Kafka client initialized", {
            broker: KAFKA_BROKER,
            clientId: KAFKA_CLIENT_ID,
            saslEnabled: !!(KAFKA_SASL_USERNAME && KAFKA_SASL_PASSWORD),
            saslMechanism: KAFKA_SASL_MECHANISM,
            sslEnabled: KAFKA_SSL,
        });
    }

    return kafkaInstance;
};

/**
 * Get or create Kafka Admin
 */
export const getKafkaAdmin = async (): Promise<Admin> => {
    if (!adminInstance) {
        const kafka = getKafkaInstance();
        adminInstance = kafka.admin();
        await adminInstance.connect();
        logger.info("Kafka admin connected");
    }
    return adminInstance;
};

/**
 * Get or create Kafka Producer
 */
export const getKafkaProducer = async (): Promise<Producer> => {
    if (!producerInstance) {
        const kafka = getKafkaInstance();
        producerInstance = kafka.producer({
            maxInFlightRequests: 5,
            idempotent: true, // Enable idempotent producer for exactly-once semantics
            transactionTimeout: 30000,
        });
        await producerInstance.connect();
        logger.info("Kafka producer connected");
    }
    return producerInstance;
};

/**
 * Create topic if not exists
 */
export const ensureTopicExists = async (
    topic: string,
    partitions: number = 3,
    replicationFactor: number = 1,
): Promise<void> => {
    try {
        const admin = await getKafkaAdmin();
        const topics = await admin.listTopics();
        const exists = topics.includes(topic);

        if (!exists) {
            await admin.createTopics({
                topics: [
                    {
                        topic,
                        numPartitions: partitions,
                        replicationFactor,
                    },
                ],
            });
            logger.info(`Topic created: ${topic}`, {
                partitions,
                replicationFactor,
            });
        } else {
            logger.debug(`Topic already exists: ${topic}`);
        }
    } catch (error) {
        logger.error("Failed to ensure topic exists", {
            topic,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
};

/**
 * Disconnect all Kafka connections
 */
export const disconnectKafka = async (): Promise<void> => {
    try {
        if (producerInstance) {
            await producerInstance.disconnect();
            logger.info("Kafka producer disconnected");
            producerInstance = null;
        }

        if (adminInstance) {
            await adminInstance.disconnect();
            logger.info("Kafka admin disconnected");
            adminInstance = null;
        }

        kafkaInstance = null;
    } catch (error) {
        logger.error("Error disconnecting Kafka", {
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

function getKafkaLogLevel(level: string): logLevel {
    const levels: Record<string, logLevel> = {
        debug: logLevel.DEBUG,
        info: logLevel.INFO,
        warn: logLevel.WARN,
        error: logLevel.ERROR,
    };
    return levels[level] || logLevel.INFO;
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on("SIGINT", async () => {
    logger.info("SIGINT received, disconnecting Kafka...");
    await disconnectKafka();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, disconnecting Kafka...");
    await disconnectKafka();
    process.exit(0);
});
