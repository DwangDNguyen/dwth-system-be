import fs from "fs";
import path from "path";
import winston from "winston";

const LOG_DIR = path.join(__dirname, "../../logs");
const SERVICE_NAME = process.env.SERVICE_NAME || "auth-service";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logger = winston.createLogger({
    defaultMeta: {
        service: SERVICE_NAME,
        env: process.env.NODE_ENV || "development",
    },
    level: LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(LOG_DIR, "error.log"),
            level: "error",
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),
        new winston.transports.File({
            filename: path.join(LOG_DIR, "combined.log"),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),
    ],
});

if (process.env.NODE_ENV !== "production") {
    logger.add(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    ({ timestamp, level, message, service, env, ...meta }) => {
                        const details = Object.keys(meta).length
                            ? JSON.stringify(meta)
                            : "";
                        return `${timestamp} [${service}] ${level}: ${message} ${details}`;
                    },
                ),
            ),
        }),
    );
}

export default logger;
