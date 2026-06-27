import moongoose from "mongoose";
import logger from "../utils/logger";

export const dbConnect = async (): Promise<void> => {
    try {
        const MONGODB_URL = process.env.MONGODB_URL;
        logger.info("Connecting to MongoDB", { MONGODB_URL });

        if (!MONGODB_URL) {
            throw new Error("MONGODB_URL is not defined");
        }

        await moongoose.connect(MONGODB_URL);
        logger.info("Auth service is connected to MongoDB");
    } catch (error) {
        if (error instanceof Error) {
            logger.error("Error connecting to MongoDB in auth service", {
                message: error.message,
                stack: error.stack,
            });
        } else {
            logger.error(
                "Something unknown error while connecting to MongoDB",
                {
                    error,
                },
            );
        }
        process.exit(1);
    }
};
