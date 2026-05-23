import app from "./app";
import dotenv from "dotenv";
import { dbConnect } from "./config/db.config";
import { redisConnect } from "./config/redis.config";

dotenv.config();

const PORT = process.env.PORT || 3000;

dbConnect();
redisConnect();

app.listen(PORT, () => {
    console.log(`auth service is running at port ${PORT}`);
});
