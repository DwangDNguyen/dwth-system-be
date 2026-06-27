import express from "express";
import cookieParser from "cookie-parser";
import {
    enhancedErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import authRoutes from "./routes/auth.routes";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware must be early to capture requestId
app.use(requestLoggingMiddleware);

app.use("/", authRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
