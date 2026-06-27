/**
 * Base Producer class for all Kafka producers
 * Implements standard message sending with retry logic and error handling
 */

import { Producer, ProducerRecord } from "kafkajs";
import { getKafkaProducer, ensureTopicExists } from "../config/kafka.config";
import logger from "../utils/logger";
import crypto from "crypto";

export abstract class BaseProducer {
    protected producer: Producer | null = null;
    protected topicName: string;
    protected partitions: number = 3;
    protected replicationFactor: number = 1;

    constructor(topicName: string) {
        this.topicName = topicName;
    }

    /**
     * Initialize producer and ensure topic exists
     */
    async initialize(): Promise<void> {
        try {
            this.producer = await getKafkaProducer();
            await ensureTopicExists(this.topicName, this.partitions, this.replicationFactor);
            logger.debug(`Producer initialized for topic: ${this.topicName}`);
        } catch (error) {
            logger.error("Failed to initialize producer", {
                topic: this.topicName,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Send single message to Kafka topic
     * @param key - Message key for partitioning
     * @param value - Message value (will be JSON stringified)
     * @param headers - Optional message headers
     */
    async sendMessage(
        key: string | null,
        value: Record<string, any>,
        headers?: Record<string, string>,
    ): Promise<string> {
        if (!this.producer) {
            await this.initialize();
        }

        const messageId = this.generateMessageId();
        const timestamp = Date.now();

        try {
            const payload: ProducerRecord = {
                topic: this.topicName,
                messages: [
                    {
                        key,
                        value: JSON.stringify({
                            ...value,
                            messageId,
                            producedAt: timestamp,
                        }),
                        headers: {
                            "correlation-id": messageId,
                            "produced-timestamp": String(timestamp),
                            "producer-service": "kafka-service",
                            ...headers,
                        },
                    },
                ],
            };

            const result = await this.producer!.send(payload);

            logger.info("Message sent successfully", {
                topic: this.topicName,
                partition: result[0].partition,
                offset: result[0].offset,
                messageId,
                key,
            });

            return messageId;
        } catch (error) {
            logger.error("Failed to send message", {
                topic: this.topicName,
                messageId,
                key,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Send batch of messages
     * @param messages - Array of messages to send
     */
    async sendBatch(
        messages: Array<{
            key: string | null;
            value: Record<string, any>;
            headers?: Record<string, string>;
        }>,
    ): Promise<string[]> {
        if (!this.producer) {
            await this.initialize();
        }

        const messageIds = messages.map(() => this.generateMessageId());
        const timestamp = Date.now();

        try {
            const payload: ProducerRecord = {
                topic: this.topicName,
                messages: messages.map((msg, idx) => ({
                    key: msg.key,
                    value: JSON.stringify({
                        ...msg.value,
                        messageId: messageIds[idx],
                        producedAt: timestamp,
                    }),
                    headers: {
                        "correlation-id": messageIds[idx],
                        "produced-timestamp": String(timestamp),
                        "producer-service": "kafka-service",
                        ...msg.headers,
                    },
                })),
            };

            const result = await this.producer!.send(payload);

            logger.info("Batch messages sent successfully", {
                topic: this.topicName,
                count: messages.length,
                partitions: result.length,
                messageIds,
            });

            return messageIds;
        } catch (error) {
            logger.error("Failed to send batch messages", {
                topic: this.topicName,
                count: messages.length,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Generate unique message ID for idempotency
     */
    protected generateMessageId(): string {
        return crypto.randomBytes(16).toString("hex");
    }
}
