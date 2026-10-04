import express from "express";
import cookieParser from "cookie-parser";
import {
    enhancedErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import authRoutes from "./routes/auth.routes";

import { getHealthStatus } from "./controllers/health.controller";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware must be early to capture requestId
app.use(requestLoggingMiddleware);

// Health check endpoint
app.get("/health", getHealthStatus);

app.use("/", authRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
