import cron from "node-cron";
import { User } from "../models/user.model";
import redisClient from "../config/redis";
import logger from "../utils/logger";

export const LANDING_CACHE_KEY = "LANDING_PAGE_DATA_V1";
// TTL slightly longer than cron interval to guarantee no cache gap
const CACHE_TTL_SECONDS = 45 * 60; // 45 minutes
const CRON_SCHEDULE = "*/30 * * * *"; // every 30 minutes

export interface FeaturedFreelancer {
    id: string;
    name: string;
    avatar: string;
    role: string;
    rating: number;
    reviews: number;
    completionRate: string;
    jobsCompleted: number;
    skills: string[];
}

export interface LandingData {
    statistics: {
        totalWorkers: number;
        totalUsers: number;
        totalJobsCompleted: number;
    };
    featuredWorkers: FeaturedFreelancer[];
    lastUpdatedAt: string;
}

/**
 * Heavy aggregation logic — runs via cron, never on HTTP request.
 * Queries MongoDB once and writes result to Redis cache.
 */
export const buildLandingCache = async (): Promise<void> => {
    logger.info("[Landing Cron] Starting cache build...");

    try {
        // Optimize: Use a single aggregation pipeline instead of 3 separate countDocuments queries.
        // This runs at C-level in MongoDB and is extremely fast when 'role' is indexed.
        const roleStats = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        let totalFreelancers = 0;
        let totalAgencies = 0;
        let totalClients = 0;

        roleStats.forEach(stat => {
            if (stat._id === "freelancer") totalFreelancers = stat.count;
            if (stat._id === "agency") totalAgencies = stat.count;
            if (stat._id === "client") totalClients = stat.count;
        });
        
        const totalWorkers = totalFreelancers + totalAgencies;

        // Fetch top Workers (freelancers + agencies) sorted by rating desc, then by completedJobs desc
        const topWorkers = await User.find({
            role: { $in: ["freelancer", "agency"] },
            isBlocked: false,
        })
            .select("fullName avatar averageRating totalReviews totalJobsCompleted skills role")
            .sort({ averageRating: -1, totalJobsCompleted: -1 })
            .limit(6)
            .lean();

        const featuredWorkers: FeaturedFreelancer[] = topWorkers.map((w) => ({
            id: (w._id as any).toString(),
            name: w.fullName,
            avatar: w.avatar,
            role: w.role,
            rating: w.averageRating ?? 0,
            reviews: w.totalReviews ?? 0,
            completionRate: "98%",
            jobsCompleted: w.totalJobsCompleted ?? 0,
            skills: Array.isArray(w.skills) ? (w.skills as unknown as string[]).slice(0, 4) : [],
        }));

        const payload: LandingData = {
            statistics: {
                totalWorkers,
                totalUsers: totalClients,
                // totalJobsCompleted will come from a dedicated Job-service in the future
                totalJobsCompleted: 12500,
            },
            featuredWorkers,
            lastUpdatedAt: new Date().toISOString(),
        };

        await redisClient.set(
            LANDING_CACHE_KEY,
            JSON.stringify(payload),
            "EX",
            CACHE_TTL_SECONDS,
        );

        logger.info("[Landing Cron] Cache updated successfully", {
            totalWorkers,
            featuredWorkersCount: featuredWorkers.length,
        });
    } catch (error) {
        logger.error("[Landing Cron] Failed to build cache", {
            error: error instanceof Error ? error.message : String(error),
        });
        // Do not re-throw — cron job must not crash the process
    }
};

/**
 * Schedules the landing page cron job.
 * Call once at server startup (in server.ts).
 */
export const startLandingCronJob = (): void => {
    // Run immediately on startup so cache is warm from the first request
    buildLandingCache();

    cron.schedule(CRON_SCHEDULE, () => {
        buildLandingCache();
    });

    logger.info(`[Landing Cron] Scheduled — ${CRON_SCHEDULE}`);
};
