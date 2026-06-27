/**
 * Mail Consumer
 * Consumes mail events from Kafka and processes them
 */

import { EachMessagePayload } from "kafkajs";
import { BaseConsumer, IConsumerConfig } from "./base.consumer";
import { IMailOtpEvent, IMailResetConfirmationEvent, MailEventType } from "../types/events";
import logger from "../utils/logger";
import axios from "axios";

const MAIL_TOPIC = process.env.MAIL_TOPIC || "mail-events";
const MAIL_SERVICE_URL = process.env.MAIL_SERVICE_URL || "http://localhost:3002/api/v1/send-mail";
const CONSUMER_GROUP = process.env.MAIL_CONSUMER_GROUP || "mail-service-group";

interface IMailPayload {
    from: string;
    email: string;
    subject: string;
    body: string;
}

class MailConsumer extends BaseConsumer {
    constructor() {
        const config: IConsumerConfig = {
            groupId: CONSUMER_GROUP,
            topic: MAIL_TOPIC,
            partitions: parseInt(process.env.MAIL_TOPIC_PARTITIONS || "3"),
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
        };

        super(config);
    }

    /**
     * Process mail event message
     */
    protected async processMessage(payload: EachMessagePayload): Promise<void> {
        const { message } = payload;

        const parsedValue = this.parseMessageValue(message.value);
        if (!parsedValue) {
            throw new Error("Failed to parse message value");
        }

        const messageId = message.headers?.["correlation-id"]?.toString() || "unknown";
        const eventType = parsedValue.type;

        try {
            switch (eventType) {
                case MailEventType.SEND_OTP_REGISTRATION:
                case MailEventType.SEND_OTP_FORGOT_PASSWORD:
                    await this.handleOtpEmail(parsedValue as IMailOtpEvent, messageId);
                    break;

                case MailEventType.SEND_PASSWORD_RESET_CONFIRMATION:
                    await this.handlePasswordResetConfirmation(
                        parsedValue as IMailResetConfirmationEvent,
                        messageId,
                    );
                    break;

                default:
                    logger.warn("Unknown mail event type", {
                        eventType,
                        messageId,
                    });
            }
        } catch (error) {
            logger.error("Error processing mail event", {
                eventType,
                messageId,
                email: parsedValue.email,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error; // Trigger consumer error handling for retry
        }
    }

    /**
     * Handle OTP email sending
     */
    private async handleOtpEmail(event: IMailOtpEvent, messageId: string): Promise<void> {
        const mailPayload: IMailPayload = {
            from: event.from || process.env.MAIL_FROM_ADDRESS || "noreply@dwth.com",
            email: event.email,
            subject: event.subject,
            body: event.body,
        };

        try {
            const response = await axios.post(MAIL_SERVICE_URL, mailPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Message-ID": messageId,
                    "X-Event-Type": event.type,
                },
                timeout: 10000,
            });

            logger.info("OTP email sent successfully", {
                messageId,
                email: event.email,
                eventType: event.type,
                response: response.status,
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error("Failed to send OTP email", {
                    messageId,
                    email: event.email,
                    eventType: event.type,
                    statusCode: error.response?.status,
                    errorData: error.response?.data,
                    message: error.message,
                });
            } else {
                logger.error("Failed to send OTP email", {
                    messageId,
                    email: event.email,
                    eventType: event.type,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            throw error;
        }
    }

    /**
     * Handle password reset confirmation email
     */
    private async handlePasswordResetConfirmation(
        event: IMailResetConfirmationEvent,
        messageId: string,
    ): Promise<void> {
        const mailPayload: IMailPayload = {
            from: event.from || process.env.MAIL_FROM_ADDRESS || "noreply@dwth.com",
            email: event.email,
            subject: event.subject,
            body: event.body,
        };

        try {
            const response = await axios.post(MAIL_SERVICE_URL, mailPayload, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Message-ID": messageId,
                    "X-Event-Type": event.type,
                },
                timeout: 10000,
            });

            logger.info("Password reset confirmation email sent successfully", {
                messageId,
                email: event.email,
                eventType: event.type,
                response: response.status,
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error("Failed to send password reset confirmation email", {
                    messageId,
                    email: event.email,
                    eventType: event.type,
                    statusCode: error.response?.status,
                    errorData: error.response?.data,
                    message: error.message,
                });
            } else {
                logger.error("Failed to send password reset confirmation email", {
                    messageId,
                    email: event.email,
                    eventType: event.type,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            throw error;
        }
    }
}

// Export singleton instance
export const mailConsumer = new MailConsumer();
