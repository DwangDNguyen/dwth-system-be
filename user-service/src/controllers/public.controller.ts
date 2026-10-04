import { Request, Response, NextFunction } from "express";
import redisClient from "../config/redis";
import { buildLandingCache, LANDING_CACHE_KEY } from "../services/landing.service";
import { ApiResponse } from "../types";
import { HTTP_STATUS } from "../constants/http-status";

/**
 * GET /api/v1/public/landing-data
 *
 * Returns pre-computed landing page data from Redis cache.
 * Never queries MongoDB directly — data is built by a background cron job.
 * On cache miss, triggers a one-time rebuild (non-blocking) and returns 202.
 */
export const getLandingDataController = async (
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const cached = await redisClient.get(LANDING_CACHE_KEY);

        if (cached) {
            const response: ApiResponse = {
                success: true,
                statusCode: HTTP_STATUS.OK,
                message: "Landing data retrieved successfully",
                data: JSON.parse(cached),
                timestamp: new Date().toISOString(),
            };
            res.status(HTTP_STATUS.OK).json(response);
            return;
        }

        // Cache miss: trigger a non-blocking rebuild then return 202
        buildLandingCache().catch(() => {
            // Errors already logged inside buildLandingCache
        });

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.ACCEPTED,
            message: "Data is being prepared. Please retry in a few seconds.",
            data: null,
            timestamp: new Date().toISOString(),
        };
        res.status(HTTP_STATUS.ACCEPTED).json(response);
    } catch (error) {
        next(error);
    }
};
