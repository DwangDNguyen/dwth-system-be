import express, { Application } from "express";
import router from "./routes/mail.routes";
import { requestLoggingMiddleware } from "./middlewares/logging.middleware";
import {
    globalErrorHandler,
    notFoundHandler,
} from "./middlewares/error.middleware";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggingMiddleware);

app.use("/api/v1", router);
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
