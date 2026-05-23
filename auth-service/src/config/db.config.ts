import moongoose from "mongoose";

export const dbConnect = async (): Promise<void> => {
    try {
        const MONGODB_URL = process.env.MONGODB_URL;
        console.log("🚀 ~ dbConnect ~ MONGODB_URL:", MONGODB_URL);
        if (!MONGODB_URL) {
            throw new Error("MONGODB_URL is not defined");
        }
        await moongoose.connect(MONGODB_URL);
        console.log("Auth service is connected to MongoDB");
    } catch (error) {
        if (error instanceof Error) {
            console.log(
                "Error connecting to MongoDB in auth service",
                error.message,
            );
            process.exit(1);
        } else {
            console.log("Something unknown error", error);
            process.exit(1);
        }
    }
};
