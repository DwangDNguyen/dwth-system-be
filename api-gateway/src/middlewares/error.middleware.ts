import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const notFoundHandler = (req: Request, res: Response): void => {
    const requestId = res.getHeader("x-request-id") as string | undefined;

    logger.warn("Route not found", {
        requestId,
        method: req.method,
        path: req.path,
    });

    res.status(404).json({
        success: false,
        message: `${req.method} ${req.path} - Route not found`,
        requestId,
        timestamp: new Date().toISOString(),
    });
};

export const globalErrorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const requestId = res.getHeader("x-request-id") as string | undefined;
    const statusCode = err?.statusCode || 500;
    const message =
        process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : err?.message || "Unexpected error";

    logger.error("Global error", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        message: err?.message,
        stack: err?.stack,
    });

    if (res.headersSent) {
        next(err);
        return;
    }

    res.status(statusCode).json({
        success: false,
        message,
        requestId,
        timestamp: new Date().toISOString(),
    });
};
