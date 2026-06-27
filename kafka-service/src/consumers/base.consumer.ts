/**
 * Base Consumer class for all Kafka consumers
 * Implements standard message consumption with error handling and processing
 */

import { Consumer, EachMessagePayload, ConsumerSubscribeTopics } from "kafkajs";
import { Kafka } from "kafkajs";
import { getKafkaInstance, ensureTopicExists } from "../config/kafka.config";
import logger from "../utils/logger";

export interface IConsumerConfig {
    groupId: string;
    topic: string;
    partitions?: number;
    replicationFactor?: number;
    sessionTimeout?: number;
    heartbeatInterval?: number;
}

export abstract class BaseConsumer {
    protected consumer: Consumer | null = null;
    protected config: IConsumerConfig;
    protected kafka: Kafka;

    constructor(config: IConsumerConfig) {
        this.config = {
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            ...config,
        };
        this.kafka = getKafkaInstance();
    }

    /**
     * Initialize consumer
     */
    async initialize(): Promise<void> {
        try {
            this.consumer = this.kafka.consumer({
                groupId: this.config.groupId,
                sessionTimeout: this.config.sessionTimeout,
                heartbeatInterval: this.config.heartbeatInterval,
                maxBytesPerPartition: 1024 * 1024, // 1MB
                allowAutoTopicCreation: false,
            });

            await this.consumer.connect();

            // Ensure topic exists before subscribing
            await ensureTopicExists(
                this.config.topic,
                this.config.partitions || 3,
                this.config.replicationFactor || 1,
            );

            logger.debug("Consumer initialized", {
                groupId: this.config.groupId,
                topic: this.config.topic,
            });
        } catch (error) {
            logger.error("Failed to initialize consumer", {
                groupId: this.config.groupId,
                topic: this.config.topic,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Subscribe to topic and start consuming messages
     */
    async startConsuming(): Promise<void> {
        if (!this.consumer) {
            await this.initialize();
        }

        try {
            const subscribeOptions: ConsumerSubscribeTopics = {
                topics: [this.config.topic],
                fromBeginning: false,
            };

            await this.consumer!.subscribe(subscribeOptions);

            logger.info("Consumer subscribed to topic", {
                groupId: this.config.groupId,
                topic: this.config.topic,
            });

            await this.consumer!.run({
                partitionsConsumedConcurrently: 3,
                eachMessage: this.handleMessage.bind(this),
            });
        } catch (error) {
            logger.error("Error during message consumption", {
                groupId: this.config.groupId,
                topic: this.config.topic,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Process individual message
     * Must be implemented by subclasses
     */
    protected abstract processMessage(
        payload: EachMessagePayload,
    ): Promise<void>;

    /**
     * Handle incoming message with error handling
     */
    private async handleMessage(payload: EachMessagePayload): Promise<void> {
        const { topic, partition, message } = payload;
        const messageId =
            message.headers?.["correlation-id"]?.toString() || "unknown";

        try {
            logger.debug("Processing message", {
                topic,
                partition,
                offset: message.offset,
                messageId,
                key: message.key?.toString(),
            });

            await this.processMessage(payload);

            logger.debug("Message processed successfully", {
                topic,
                partition,
                offset: message.offset,
                messageId,
            });
        } catch (error) {
            logger.error("Error processing message", {
                topic,
                partition,
                offset: message.offset,
                messageId,
                key: message.key?.toString(),
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            // Re-throw to trigger Kafka consumer error handling
            throw error;
        }
    }

    /**
     * Gracefully disconnect consumer
     */
    async disconnect(): Promise<void> {
        try {
            if (this.consumer) {
                await this.consumer.disconnect();
                logger.info("Consumer disconnected", {
                    groupId: this.config.groupId,
                    topic: this.config.topic,
                });
                this.consumer = null;
            }
        } catch (error) {
            logger.error("Error disconnecting consumer", {
                groupId: this.config.groupId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Parse message value safely
     */
    protected parseMessageValue(
        value: Buffer | string | null,
    ): Record<string, any> | null {
        if (!value) return null;

        try {
            const str = typeof value === "string" ? value : value.toString();
            return JSON.parse(str);
        } catch (error) {
            logger.error("Failed to parse message value", {
                error: error instanceof Error ? error.message : String(error),
                value: value.toString().substring(0, 200),
            });
            return null;
        }
    }
}
