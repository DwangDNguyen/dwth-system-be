/**
 * Event types and interfaces for Kafka messaging
 */

// ─── Mail Events ──────────────────────────────────────────────────────────────

export enum MailEventType {
    SEND_OTP_REGISTRATION = "mail.send_otp_registration",
    SEND_OTP_FORGOT_PASSWORD = "mail.send_otp_forgot_password",
    SEND_PASSWORD_RESET_CONFIRMATION = "mail.send_password_reset_confirmation",
}

export interface IMailEventPayload {
    id: string; // Event ID for idempotency
    timestamp: number;
    email: string;
    subject: string;
    body: string;
    from?: string;
    retryCount?: number;
}

export interface IMailOtpEvent extends IMailEventPayload {
    type: MailEventType.SEND_OTP_REGISTRATION | MailEventType.SEND_OTP_FORGOT_PASSWORD;
    otp: string;
    fullname: string;
    expiresIn: number; // in seconds
}

export interface IMailResetConfirmationEvent extends IMailEventPayload {
    type: MailEventType.SEND_PASSWORD_RESET_CONFIRMATION;
    fullname: string;
    resetTime: string;
}

// ─── Auth Events ──────────────────────────────────────────────────────────────

export enum AuthEventType {
    USER_REGISTERED = "auth.user_registered",
    USER_LOGGED_IN = "auth.user_logged_in",
    USER_LOGGED_OUT = "auth.user_logged_out",
    PASSWORD_RESET = "auth.password_reset",
}

export interface IAuthEventPayload {
    id: string; // Event ID
    timestamp: number;
    userId?: string;
    email: string;
    action: AuthEventType;
}

// ─── Generic Event ────────────────────────────────────────────────────────────

export type KafkaEvent = IMailOtpEvent | IMailResetConfirmationEvent | IAuthEventPayload;

export interface IKafkaMessage {
    key: string | null;
    value: string; // JSON stringified
    headers?: Record<string, string>;
}
