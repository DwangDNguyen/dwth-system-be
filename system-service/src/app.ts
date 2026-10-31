import express from "express";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";
import { extractUserContext } from "./middlewares/require-role.middleware";
import apiRoutes from "./routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLoggingMiddleware);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "system-service",
    timestamp: new Date().toISOString(),
  });
});

// Extract user identity and role from Gateway headers or JWT
app.use(extractUserContext);

// Centralized API v1 Routes
app.use("/api/v1", apiRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
