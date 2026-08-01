import path from "path";
import express, { Request, Response } from "express";
import {
    enhancedErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import { ApiResponse } from "./types";
import { HTTP_STATUS } from "./constants/http-status";
import userRoutes from "./routes/user.routes";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded static files publicly
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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

// Mount User profile REST API routes (supports both gateway proxy and direct service calls)
app.use("/api/v1/users", userRoutes);
app.use("/", userRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
