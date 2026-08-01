/**
 * User event producer for auth-service
 * Sends user-related events (e.g. registration) to Kafka topic
 */

import { Producer, ProducerRecord } from "kafkajs";
import { getKafkaProducer } from "../config/kafka.config";
import logger from "../utils/logger";
import crypto from "crypto";

const USER_TOPIC = process.env.USER_TOPIC || "user-events";

export interface IUserEventPayload {
    id: string;
    type: string;
    timestamp: number;
    authUserId: string;
    fullname: string;
    email: string;
    role: string;
    [key: string]: any;
}

class AuthUserProducer {
    private producer: Producer | null = null;
    private topicName: string = USER_TOPIC;

    /**
     * Initialize producer connection
     */
    async initialize(): Promise<void> {
        try {
            this.producer = await getKafkaProducer();
            logger.debug("Auth user producer initialized", { topic: this.topicName });
        } catch (error) {
            logger.error("Failed to initialize auth user producer", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Publish user created event to Kafka
     */
    async publishUserCreated(data: {
        authUserId: string;
        fullname: string;
        email: string;
        role: string;
    }): Promise<string> {
        if (!this.producer) {
            await this.initialize();
        }

        const messageId = crypto.randomBytes(16).toString("hex");
        const timestamp = Date.now();

        const event: IUserEventPayload = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: "user.created",
            timestamp,
            authUserId: data.authUserId,
            fullname: data.fullname,
            email: data.email,
            role: data.role,
        };

        try {
            const payload: ProducerRecord = {
                topic: this.topicName,
                messages: [
                    {
                        key: data.authUserId, // Partition by authUserId for ordering
                        value: JSON.stringify({
                            ...event,
                            messageId,
                            producedAt: timestamp,
                        }),
                        headers: {
                            "correlation-id": messageId,
                            "produced-timestamp": String(timestamp),
                            "producer-service": "auth-service",
                        },
                    },
                ],
            };

            await this.producer!.send(payload);
            logger.info("User created event published to Kafka", {
                messageId,
                authUserId: data.authUserId,
                email: data.email,
                topic: this.topicName,
            });

            return messageId;
        } catch (error) {
            logger.error("Error publishing user created event", {
                authUserId: data.authUserId,
                email: data.email,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

// Export singleton instance
export const authUserProducer = new AuthUserProducer();
