import { Request, Response } from "express";
import mongoose from "mongoose";
import { getRedisClient } from "../config/redis.config";

export const getHealthStatus = (_req: Request, res: Response) => {
    try {
        const memoryUsage = process.memoryUsage();
        
        // Check Redis
        let redisStatus = "DOWN";
        try {
            const redisClient = getRedisClient();
            if (redisClient && redisClient.isReady) {
                redisStatus = "UP";
            }
        } catch (error) {
            // Redis client might not be initialized yet
            redisStatus = "DOWN";
        }

        // Check MongoDB
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        const mongoStatus = mongoose.connection.readyState === 1 ? "UP" : "DOWN";

        const healthData = {
            service: "auth-service",
            status: "UP",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
            },
            dependencies: {
                mongodb: mongoStatus,
                redis: redisStatus
            }
        };

        // If a critical dependency is down, we might want to return 503 Service Unavailable,
        // but for now 200 OK with the statuses is standard for simple monitoring.
        // A strictly correct readiness probe would return 503 if dependencies are down.
        const statusCode = (mongoStatus === "UP" && redisStatus === "UP") ? 200 : 503;
        
        // Update top-level status if degraded
        if (statusCode === 503) {
            healthData.status = "DEGRADED";
        }

        res.status(statusCode).json(healthData);
    } catch (error) {
        res.status(503).json({
            service: "auth-service",
            status: "DOWN",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
