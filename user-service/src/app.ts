import express, { Request, Response } from "express";
import {
    enhancedErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import { ApiResponse } from "./types";
import { HTTP_STATUS } from "./constants/http-status";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware must be early to capture requestId
app.use(requestLoggingMiddleware);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
    const response: ApiResponse = {
        success: true,
        statusCode: HTTP_STATUS.OK,
        message: "User service is healthy",
        timestamp: new Date().toISOString(),
    };
    res.status(HTTP_STATUS.OK).json(response);
});

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
