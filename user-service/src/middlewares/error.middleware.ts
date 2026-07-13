import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/base.error";
import { ApiResponse } from "../types";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/http-status";
import logger from "../utils/logger";

/**
 * Global Error Handler Middleware - Simplified
 */
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    const requestId = res.getHeader("x-request-id") as string | undefined;
    const statusCode =
        err instanceof AppError
            ? err.statusCode
            : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    const message =
        err instanceof AppError
            ? err.message
            : process.env.NODE_ENV === "production"
              ? ERROR_MESSAGES.SERVER_ERROR
              : err.message || ERROR_MESSAGES.UNKNOWN;

    logger.error("Request error", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        message: err.message,
        stack: err instanceof Error ? err.stack : undefined,
    });

    const body: ApiResponse = {
        success: false,
        statusCode,
        message,
        errors: err instanceof AppError ? err.errors : undefined,
        timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(body);
};

/**
 * Handle 404 - Route Not Found
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    const requestId = res.getHeader("x-request-id") as string | undefined;
    const body: ApiResponse = {
        success: false,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: `${req.method} ${req.path} - Route not found`,
        timestamp: new Date().toISOString(),
    };

    logger.warn("Route not found", {
        requestId,
        method: req.method,
        path: req.path,
    });

    res.status(HTTP_STATUS.NOT_FOUND).json(body);
};

/**
 * Handle Mongoose Validation Errors
 */
export const handleMongooseValidationError = (err: any): AppError => {
    const errors: Record<string, string> = {};

    Object.values(err.errors).forEach((error: any) => {
        const field = error.path;
        if (!errors[field]) {
            errors[field] = error.message;
        }
    });

    return new AppError("Validation failed", HTTP_STATUS.BAD_REQUEST, errors);
};

/**
 * Handle Mongoose Duplicate Key Error (E11000)
 */
export const handleMongooseDuplicateError = (err: any): AppError => {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];

    const errors: Record<string, string> = {
        [field]: `${field.charAt(0).toUpperCase() + field.slice(1)} ${value} already exists`,
    };

    return new AppError(
        `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        HTTP_STATUS.BAD_REQUEST,
        errors,
    );
};

/**
 * Handle Mongoose Cast Error
 */
export const handleMongooseCastError = (err: any): AppError => {
    const errors: Record<string, string> = {
        [err.path]: `Invalid ${err.path}: ${err.value}`,
    };

    return new AppError(`Invalid ${err.path}`, HTTP_STATUS.BAD_REQUEST, errors);
};

/**
 * Enhanced Error Handler with Mongoose Error Handling
 */
export const enhancedErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    let error = err;

    if (err.name === "ValidationError") {
        error = handleMongooseValidationError(err);
    } else if (err.code === 11000) {
        error = handleMongooseDuplicateError(err);
    } else if (err.name === "CastError") {
        error = handleMongooseCastError(err);
    }

    errorHandler(error, req, res, next);
};
