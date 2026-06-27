/**
 * Mail event producer for auth-service
 * Sends mail-related events to Kafka topic
 */

import { Producer, ProducerRecord } from "kafkajs";
import { getKafkaProducer } from "../config/kafka.config";
import logger from "../utils/logger";
import crypto from "crypto";

const MAIL_TOPIC = process.env.MAIL_TOPIC || "mail-events";

export interface IMailEventPayload {
    id: string;
    type: string;
    timestamp: number;
    email: string;
    subject: string;
    body: string;
    from?: string;
    [key: string]: any;
}

class AuthMailProducer {
    private producer: Producer | null = null;
    private topicName: string = MAIL_TOPIC;

    /**
     * Initialize producer connection
     */
    async initialize(): Promise<void> {
        try {
            this.producer = await getKafkaProducer();
            logger.debug("Auth mail producer initialized", { topic: this.topicName });
        } catch (error) {
            logger.error("Failed to initialize auth mail producer", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Send mail event to Kafka
     * Non-blocking: events are sent asynchronously
     */
    async publishMailEvent(event: IMailEventPayload): Promise<string> {
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
                        key: event.email, // Partition by email for ordering
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

            // Fire and forget - don't wait for broker acknowledgment in auth-service
            this.producer!.send(payload).catch((error) => {
                logger.error("Failed to publish mail event to Kafka", {
                    messageId,
                    email: event.email,
                    eventType: event.type,
                    error: error instanceof Error ? error.message : String(error),
                });
            });

            logger.debug("Mail event published to Kafka (async)", {
                messageId,
                email: event.email,
                eventType: event.type,
                topic: this.topicName,
            });

            return messageId;
        } catch (error) {
            logger.error("Error publishing mail event", {
                email: event.email,
                eventType: event.type,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    /**
     * Send OTP registration email event
     */
    async sendOtpRegistration(data: {
        email: string;
        fullname: string;
        otp: string;
        expiresIn: number;
    }): Promise<void> {
        const event: IMailEventPayload = {
            id: this.generateEventId(),
            type: "mail.send_otp_registration",
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            otp: data.otp,
            expiresIn: data.expiresIn,
            subject: "[DWth System] Mã xác nhận đăng ký tài khoản",
            body: `<p>Xin chào ${data.fullname},</p><p>Mã xác nhận của bạn là: <strong>${data.otp}</strong></p><p>Mã này sẽ hết hạn trong ${data.expiresIn} giây.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        await this.publishMailEvent(event);
    }

    /**
     * Send OTP forgot password email event
     */
    async sendOtpForgotPassword(data: {
        email: string;
        fullname: string;
        otp: string;
        expiresIn: number;
    }): Promise<void> {
        const event: IMailEventPayload = {
            id: this.generateEventId(),
            type: "mail.send_otp_forgot_password",
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            otp: data.otp,
            expiresIn: data.expiresIn,
            subject: "[DWth System] Mã xác nhận quên mật khẩu",
            body: `<p>Xin chào ${data.fullname},</p><p>Mã xác nhận quên mật khẩu của bạn là: <strong>${data.otp}</strong></p><p>Mã này sẽ hết hạn trong ${data.expiresIn} giây.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        await this.publishMailEvent(event);
    }

    /**
     * Send password reset confirmation email event
     */
    async sendPasswordResetConfirmation(data: {
        email: string;
        fullname: string;
        resetTime: string;
    }): Promise<void> {
        const event: IMailEventPayload = {
            id: this.generateEventId(),
            type: "mail.send_password_reset_confirmation",
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            resetTime: data.resetTime,
            subject: "[DWth System] Mật khẩu của bạn đã được đặt lại",
            body: `<p>Xin chào ${data.fullname},</p><p>Mật khẩu của bạn đã được đặt lại thành công vào lúc ${data.resetTime}.</p><p>Nếu đây không phải là bạn, vui lòng liên hệ với chúng tôi ngay.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        await this.publishMailEvent(event);
    }

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return crypto.randomBytes(16).toString("hex");
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Export singleton instance
export const authMailProducer = new AuthMailProducer();
