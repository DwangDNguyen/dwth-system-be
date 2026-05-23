import { AppError } from "./base.error";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/http-status";

/**
 * Validation Error
 */
export class ValidationError extends AppError {
    constructor(
        message: string = ERROR_MESSAGES.BAD_REQUEST,
        errors?: Record<string, string>,
    ) {
        super(message, HTTP_STATUS.BAD_REQUEST, errors);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Duplicate Email Error
 */
export class DuplicateEmailError extends AppError {
    constructor(email?: string) {
        const errors = email
            ? { email: `Email ${email} already exists` }
            : undefined;
        super("Email already exists", HTTP_STATUS.BAD_REQUEST, errors);
        Object.setPrototypeOf(this, DuplicateEmailError.prototype);
    }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
    constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
        super(message, HTTP_STATUS.NOT_FOUND);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * User Not Found Error
 */
export class UserNotFoundError extends NotFoundError {
    constructor(identifier?: string) {
        super(identifier ? `User ${identifier} not found` : "User not found");
        Object.setPrototypeOf(this, UserNotFoundError.prototype);
    }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
        super(message, HTTP_STATUS.UNAUTHORIZED);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends AppError {
    constructor(message: string = ERROR_MESSAGES.FORBIDDEN) {
        super(message, HTTP_STATUS.FORBIDDEN);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * Bad Request Error
 */
export class BadRequestError extends AppError {
    constructor(
        message: string = ERROR_MESSAGES.BAD_REQUEST,
        errors?: Record<string, string>,
    ) {
        super(message, HTTP_STATUS.BAD_REQUEST, errors);
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
    constructor(message: string = ERROR_MESSAGES.SERVER_ERROR) {
        super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}

/**
 * OTP Expired Error - OTP không tồn tại hoặc đã hết hạn
 */
export class OtpExpiredError extends AppError {
    constructor() {
        super("OTP has expired or does not exist", HTTP_STATUS.BAD_REQUEST, {
            otp: "OTP has expired. Please request a new one.",
        });
        Object.setPrototypeOf(this, OtpExpiredError.prototype);
    }
}

/**
 * OTP Invalid Error - OTP không khớp
 */
export class OtpInvalidError extends AppError {
    constructor() {
        super("Invalid OTP", HTTP_STATUS.BAD_REQUEST, {
            otp: "The OTP you entered is incorrect.",
        });
        Object.setPrototypeOf(this, OtpInvalidError.prototype);
    }
}

/**
 * Reset Token Invalid - token sai hoặc đã dùng
 */
export class ResetTokenInvalidError extends AppError {
    constructor() {
        super("Invalid or expired reset token", HTTP_STATUS.BAD_REQUEST, {
            resetToken: "Reset token is invalid or has already been used.",
        });
        Object.setPrototypeOf(this, ResetTokenInvalidError.prototype);
    }
}

/**
 * Invalid Credentials - email/password sai (dùng message chung, tránh lộ thông tin)
 */
export class InvalidCredentialsError extends AppError {
    constructor() {
        super("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
        Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
    }
}

/**
 * Too Many Requests - rate limit
 */
export class TooManyRequestsError extends AppError {
    constructor(
        message: string = "Too many requests. Please try again later.",
    ) {
        super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
        Object.setPrototypeOf(this, TooManyRequestsError.prototype);
    }
}
