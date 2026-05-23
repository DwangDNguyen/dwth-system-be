import { createClient, RedisClientType } from "redis";

let client: RedisClientType;
const redisConnect = async () => {
    client = createClient({
        username: "default",
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
        },
    });

    client.on("error", (err) => console.log("Redis Client Error", err));

    await client.connect();

    console.log("Auth service redis is connected successfully");
};

const getRedisClient = () => {
    if (!client) {
        throw new Error("Redis client is not initialized.");
    }
    return client;
};

export { redisConnect, getRedisClient };
