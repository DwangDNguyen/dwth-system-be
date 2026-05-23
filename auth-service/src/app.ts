import express from "express";
import cookieParser from "cookie-parser";
import {
    enhancedErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.routes";

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Routes
// Note: API Gateway proxies /api/v1/auth to http://localhost:3001
// So auth service receives requests without the /api/v1/auth prefix
app.use("/", authRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(enhancedErrorHandler);

export default app;
