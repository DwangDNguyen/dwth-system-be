import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
dotenv.config();

const app = express();

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
app.use("/api/v1/auth", proxy("http://localhost:3001"));

app.listen(PORT, () => {
    console.log(`Gateway service is running at port ${PORT}`);
});
