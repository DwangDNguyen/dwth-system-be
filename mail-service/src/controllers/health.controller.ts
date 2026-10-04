import { Request, Response } from "express";

export const getHealthStatus = (_req: Request, res: Response) => {
    try {
        const memoryUsage = process.memoryUsage();

        const healthData = {
            service: "mail-service",
            status: "UP",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: {
                heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
            }
        };

        res.status(200).json(healthData);
    } catch (error) {
        res.status(503).json({
            service: "mail-service",
            status: "DOWN",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
