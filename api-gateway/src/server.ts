import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
import cookieParser from "cookie-parser";
import { authenticate } from "./middlewares/authenticate.middleware";
dotenv.config();

const app = express();
app.use(cookieParser());
app.use("/api/v1", authenticate);

const PORT = process.env.PORT;

const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS || "http://localhost:5173"
).split(",");

app.use(
    cors({
        origin: (origin, callback) => {
            // Cho phép requests không có origin (Postman, curl, server-to-server)
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin ${origin} not allowed`));
            }
        },
        credentials: true, // cho phép gửi cookie (refresh token) kèm request
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Set-Cookie"],
    }),
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use(
    "/api/v1/auth",
    proxy("http://localhost:3001", {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            // Forward Authorization header as-is
            if (srcReq.headers && srcReq.headers.authorization) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["authorization"] = String(
                    srcReq.headers.authorization,
                );
            }

            // If authenticate middleware attached `user`, forward it in secure headers
            const anyReq: any = srcReq;
            if (anyReq.user) {
                proxyReqOpts.headers = proxyReqOpts.headers || {};
                proxyReqOpts.headers["x-user-id"] = anyReq.user.userId;
                proxyReqOpts.headers["x-user-email"] = anyReq.user.email;
                proxyReqOpts.headers["x-user-role"] = anyReq.user.role;
            }

            return proxyReqOpts;
        },
    }),
);

app.listen(PORT, () => {
    console.log(`Gateway service is running at port ${PORT}`);
});
