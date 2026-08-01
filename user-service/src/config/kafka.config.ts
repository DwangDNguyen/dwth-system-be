/**
 * Kafka consumer configuration for user-service
 * Connects to user events topic and consumes user creation events
 */

import { Consumer, logLevel } from "kafkajs";
import { Kafka } from "kafkajs";
import dotenv from "dotenv";
import logger from "../utils/logger";
import { handleUserMessage } from "../consumers/user.consumer";

dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "user-service";
const KAFKA_LOG_LEVEL = process.env.KAFKA_LOG_LEVEL || "info";
const KAFKA_SASL_USERNAME = process.env.KAFKA_SASL_USERNAME || "";
const KAFKA_SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD || "";
const KAFKA_SASL_MECHANISM = process.env.KAFKA_SASL_MECHANISM || "plain";
const KAFKA_SSL = process.env.KAFKA_SSL === "true";
const USER_TOPIC = process.env.USER_TOPIC || "user-events";
const USER_CONSUMER_GROUP = process.env.USER_CONSUMER_GROUP || "user-service-group";

// ─── Kafka Consumer Singleton ─────────────────────────────────────────────────

let kafkaInstance: Kafka | null = null;
let consumerInstance: Consumer | null = null;

/**
 * Get or create Kafka instance
 */
const getKafkaInstance = (): Kafka => {
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

        logger.info("Kafka client initialized for User Service", {
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
 * Get or create Kafka Consumer
 */
const getKafkaConsumer = async (): Promise<Consumer> => {
    if (!consumerInstance) {
        const kafka = getKafkaInstance();
        consumerInstance = kafka.consumer({
            groupId: USER_CONSUMER_GROUP,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });
        await consumerInstance.connect();
        logger.info("Kafka user consumer connected", {
            groupId: USER_CONSUMER_GROUP,
            topic: USER_TOPIC,
        });
    }
    return consumerInstance;
};

/**
 * Start consuming user events
 */
export async function startUserConsumer(): Promise<void> {
    try {
        const consumer = await getKafkaConsumer();

        await consumer.subscribe({
            topic: USER_TOPIC,
            fromBeginning: false,
        });

        logger.info("User consumer subscribed to topic", {
            topic: USER_TOPIC,
            groupId: USER_CONSUMER_GROUP,
        });

        await consumer.run({
            partitionsConsumedConcurrently: 1,
            eachMessage: handleUserMessage,
        });
    } catch (error) {
        logger.error("Failed to start user consumer", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * Disconnect Kafka consumer
 */
export async function disconnectUserConsumer(): Promise<void> {
    try {
        if (consumerInstance) {
            await consumerInstance.disconnect();
            logger.info("User consumer disconnected");
            consumerInstance = null;
        }
        kafkaInstance = null;
    } catch (error) {
        logger.error("Error disconnecting user consumer", {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

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
