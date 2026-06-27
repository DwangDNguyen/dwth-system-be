import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const requestLoggingMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const requestId =
        (req.headers["x-request-id"] as string) ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    res.setHeader("x-request-id", requestId);

    logger.info("Incoming request", {
        requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
    });

    const start = Date.now();
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        const level =
            res.statusCode >= 500
                ? "error"
                : res.statusCode >= 400
                  ? "warn"
                  : "info";

        logger.log(level, "Request completed", {
            requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs,
        });
    });

    next();
};
