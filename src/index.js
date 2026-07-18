import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/db.js";
import mongoose from "mongoose";
import { startReminderCron } from "./utils/reminderCron.js";

dotenv.config({ path: "./.env", override: true });

const port = process.env.PORT || 3000;

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing in .env");
  process.exit(1);
}

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
      startReminderCron();
    });
  })
  .catch(error => {
    console.error("MongoDB connection failed!", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});