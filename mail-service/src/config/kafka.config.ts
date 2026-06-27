/**
 * Kafka consumer configuration for mail-service
 * Connects to kafka-service's mail events topic
 */

import { Consumer, logLevel } from "kafkajs";
import { Kafka } from "kafkajs";
import { EachMessagePayload } from "kafkajs";
import dotenv from "dotenv";
import logger from "../utils/logger";
import axios from "axios";

dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "mail-service";
const KAFKA_LOG_LEVEL = process.env.KAFKA_LOG_LEVEL || "info";
const KAFKA_SASL_USERNAME = process.env.KAFKA_SASL_USERNAME || "";
const KAFKA_SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD || "";
const KAFKA_SASL_MECHANISM = process.env.KAFKA_SASL_MECHANISM || "scram-sha-256";
const KAFKA_SSL = process.env.KAFKA_SSL === "true";
const MAIL_TOPIC = process.env.MAIL_TOPIC || "mail-events";
const MAIL_CONSUMER_GROUP = process.env.MAIL_CONSUMER_GROUP || "mail-service-group";

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
 * Get or create Kafka Consumer
 */
const getKafkaConsumer = async (): Promise<Consumer> => {
    if (!consumerInstance) {
        const kafka = getKafkaInstance();
        consumerInstance = kafka.consumer({
            groupId: MAIL_CONSUMER_GROUP,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        });
        await consumerInstance.connect();
        logger.info("Kafka consumer connected", {
            groupId: MAIL_CONSUMER_GROUP,
            topic: MAIL_TOPIC,
        });
    }
    return consumerInstance;
};

/**
 * Handle mail event message
 */
async function handleMailMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    const messageId = message.headers?.["correlation-id"]?.toString() || "unknown";

    try {
        const parsedValue = message.value
            ? JSON.parse(message.value.toString())
            : null;

        if (!parsedValue) {
            throw new Error("Failed to parse message value");
        }

        // Extract mail data from event
        const mailData = {
            from: parsedValue.from || process.env.MAIL_FROM_ADDRESS || "noreply@dwth.com",
            email: parsedValue.email,
            subject: parsedValue.subject,
            body: parsedValue.body,
        };

        logger.debug("Processing mail event", {
            messageId,
            email: mailData.email,
            eventType: parsedValue.type,
        });

        // Send email
        const response = await axios.post(
            "http://localhost:3002/api/v1/send-mail",
            mailData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Message-ID": messageId,
                },
                timeout: 10000,
            },
        );

        logger.info("Mail event processed successfully", {
            messageId,
            email: mailData.email,
            eventType: parsedValue.type,
            response: response.status,
        });
    } catch (error) {
        logger.error("Error processing mail event", {
            messageId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error; // Trigger Kafka error handling for retry
    }
}

/**
 * Start consuming mail events
 */
export async function startMailConsumer(): Promise<void> {
    try {
        const consumer = await getKafkaConsumer();

        await consumer.subscribe({
            topic: MAIL_TOPIC,
            fromBeginning: false,
        });

        logger.info("Mail consumer subscribed to topic", {
            topic: MAIL_TOPIC,
            groupId: MAIL_CONSUMER_GROUP,
        });

        await consumer.run({
            partitionsConsumedConcurrently: 3,
            eachMessage: handleMailMessage,
        });
    } catch (error) {
        logger.error("Failed to start mail consumer", {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

/**
 * Disconnect Kafka consumer
 */
export async function disconnectMailConsumer(): Promise<void> {
    try {
        if (consumerInstance) {
            await consumerInstance.disconnect();
            logger.info("Mail consumer disconnected");
            consumerInstance = null;
        }
        kafkaInstance = null;
    } catch (error) {
        logger.error("Error disconnecting mail consumer", {
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
