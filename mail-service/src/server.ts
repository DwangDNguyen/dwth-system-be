import app from "./app";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Mail service is running at port ${PORT}`);
});
