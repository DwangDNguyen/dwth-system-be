import { Response, NextFunction } from "express";
import logger from "../utils/logger";

export const proxyErrorHandler = (
    err: Error,
    res: Response,
    next: NextFunction,
): void => {
    const requestId = res.getHeader("x-request-id") as string | undefined;

    logger.error("Proxy error", {
        requestId,
        message: err.message,
        stack: err.stack,
    });

    if (res.headersSent) {
        next(err);
        return;
    }

    res.status(502).json({
        success: false,
        message:
            process.env.NODE_ENV === "production"
                ? "Service temporarily unavailable"
                : err.message,
        requestId,
        timestamp: new Date().toISOString(),
    });
};
