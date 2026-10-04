import express, { Application } from "express";
import router from "./routes/mail.routes";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";

const app: Application = express();

import { getHealthStatus } from "./controllers/health.controller";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggingMiddleware);

app.get("/health", getHealthStatus);

app.use("/api/v1", router);
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
