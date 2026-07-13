import { HTTP_STATUS } from "../constants/http-status";

/**
 * Base Error Class - Simplified
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errors?: Record<string, string>;

    constructor(
        message: string,
        statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
        errors?: Record<string, string>,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
