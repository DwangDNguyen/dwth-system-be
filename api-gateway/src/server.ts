import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import proxy from "express-http-proxy";
import cookieParser from "cookie-parser";
import { authenticate } from "./middlewares/authenticate.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import { proxyErrorHandler } from "./middlewares/proxy-error.middleware";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import logger from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS || "http://localhost:5173"
).split(",");

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                logger.warn("CORS origin rejected", {
                    origin,
                    allowedOrigins: ALLOWED_ORIGINS,
                });
                callback(new Error(`CORS: origin ${origin} not allowed`));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Set-Cookie", "x-request-id"],
    }),
);

app.use(cookieParser());
app.use(requestLoggingMiddleware);
app.use("/api/v1", authenticate);

app.use(
    "/api/v1/auth",
    proxy(process.env.AUTH_SERVICE_URL || "http://localhost:3001", {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.headers && srcReq.headers.authorization) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["authorization"] = String(
                    srcReq.headers.authorization,
                );
            }

            const anyReq: any = srcReq;
            if (anyReq.user) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["x-user-id"] = anyReq.user.userId;
                proxyReqOpts.headers["x-user-email"] = anyReq.user.email;
                proxyReqOpts.headers["x-user-role"] = anyReq.user.role;
            }

            const requestId =
                (srcReq.headers["x-request-id"] as string) ||
                `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
            proxyReqOpts.headers = proxyReqOpts.headers || {};
            proxyReqOpts.headers["x-request-id"] = requestId;

            return proxyReqOpts;
        },
        proxyErrorHandler: (err: any, res: Response, next: NextFunction) => {
            proxyErrorHandler(err, res, next);
        },
    }),
);

app.use(
    "/api/v1/users",
    proxy(process.env.USER_SERVICE_URL || "http://localhost:6000", {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.headers && srcReq.headers.authorization) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["authorization"] = String(
                    srcReq.headers.authorization,
                );
            }

            const anyReq: any = srcReq;
            if (anyReq.user) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["x-user-id"] = anyReq.user.userId;
                proxyReqOpts.headers["x-user-email"] = anyReq.user.email;
                proxyReqOpts.headers["x-user-role"] = anyReq.user.role;
            }

            const requestId =
                (srcReq.headers["x-request-id"] as string) ||
                `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
            proxyReqOpts.headers = proxyReqOpts.headers || {};
            proxyReqOpts.headers["x-request-id"] = requestId;

            return proxyReqOpts;
        },
        proxyErrorHandler: (err: any, res: Response, next: NextFunction) => {
            proxyErrorHandler(err, res, next);
        },
    }),
);

// Proxy static uploaded files to user-service
app.use(
    "/uploads",
    proxy(process.env.USER_SERVICE_URL || "http://localhost:6000"),
);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
    logger.info(`Gateway service is running at port ${PORT}`);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
});
