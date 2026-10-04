import path from "path";
import express from "express";
import {
  enhancedErrorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import userRoutes from "./routes/user.routes";
import { getHealthStatus } from "./controllers/health.controller";
import publicRoutes from "./routes/public.routes";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded static files publicly
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Request logging middleware must be early to capture requestId
app.use(requestLoggingMiddleware);

// Health check endpoint
app.get("/health", getHealthStatus);

// Public routes (no auth required) - Landing page data
app.use("/api/v1/public", publicRoutes);

// Protected user profile routes
app.use("/api/v1/users", userRoutes);
app.use("/", userRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
