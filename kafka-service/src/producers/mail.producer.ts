/**
 * Mail Producer
 * Sends mail events to Kafka topic
 */

import { BaseProducer } from "./base.producer";
import { IMailOtpEvent, IMailResetConfirmationEvent, MailEventType } from "../types/events";
import logger from "../utils/logger";

const MAIL_TOPIC = process.env.MAIL_TOPIC || "mail-events";

class MailProducer extends BaseProducer {
    constructor() {
        super(MAIL_TOPIC);
        this.partitions = parseInt(process.env.MAIL_TOPIC_PARTITIONS || "3");
    }

    /**
     * Send OTP registration email event
     */
    async sendOtpRegistration(data: {
        email: string;
        fullname: string;
        otp: string;
        expiresIn: number;
    }): Promise<string> {
        const event: IMailOtpEvent = {
            id: this.generateEventId(),
            type: MailEventType.SEND_OTP_REGISTRATION,
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            otp: data.otp,
            expiresIn: data.expiresIn,
            subject: "[DWth System] Mã xác nhận đăng ký tài khoản",
            body: `<p>Xin chào ${data.fullname},</p><p>Mã xác nhận của bạn là: <strong>${data.otp}</strong></p><p>Mã này sẽ hết hạn trong ${data.expiresIn} giây.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        logger.debug("Sending OTP registration event", {
            email: data.email,
            eventId: event.id,
        });

        return await this.sendMessage(data.email, event);
    }

    /**
     * Send OTP forgot password email event
     */
    async sendOtpForgotPassword(data: {
        email: string;
        fullname: string;
        otp: string;
        expiresIn: number;
    }): Promise<string> {
        const event: IMailOtpEvent = {
            id: this.generateEventId(),
            type: MailEventType.SEND_OTP_FORGOT_PASSWORD,
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            otp: data.otp,
            expiresIn: data.expiresIn,
            subject: "[DWth System] Mã xác nhận quên mật khẩu",
            body: `<p>Xin chào ${data.fullname},</p><p>Mã xác nhận quên mật khẩu của bạn là: <strong>${data.otp}</strong></p><p>Mã này sẽ hết hạn trong ${data.expiresIn} giây.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        logger.debug("Sending OTP forgot password event", {
            email: data.email,
            eventId: event.id,
        });

        return await this.sendMessage(data.email, event);
    }

    /**
     * Send password reset confirmation email event
     */
    async sendPasswordResetConfirmation(data: {
        email: string;
        fullname: string;
        resetTime: string;
    }): Promise<string> {
        const event: IMailResetConfirmationEvent = {
            id: this.generateEventId(),
            type: MailEventType.SEND_PASSWORD_RESET_CONFIRMATION,
            timestamp: Date.now(),
            email: data.email,
            fullname: data.fullname,
            resetTime: data.resetTime,
            subject: "[DWth System] Mật khẩu của bạn đã được đặt lại",
            body: `<p>Xin chào ${data.fullname},</p><p>Mật khẩu của bạn đã được đặt lại thành công vào lúc ${data.resetTime}.</p><p>Nếu đây không phải là bạn, vui lòng liên hệ với chúng tôi ngay.</p>`,
            from: process.env.MAIL_FROM_ADDRESS,
        };

        logger.debug("Sending password reset confirmation event", {
            email: data.email,
            eventId: event.id,
        });

        return await this.sendMessage(data.email, event);
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Export singleton instance
export const mailProducer = new MailProducer();
