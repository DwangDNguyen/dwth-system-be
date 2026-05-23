import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";
dotenv.config();

const app = express();

const PORT = process.env.PORT;

app.use("/api/v1/auth", proxy("http://localhost:3001"));

app.listen(PORT, () => {
    console.log(`Gateway service is running at port ${PORT}`);
});
