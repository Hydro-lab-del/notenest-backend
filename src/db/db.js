// import mongoose from "mongoose";

// const connectDB = async () => {
//   try {
//     if (!process.env.MONGO_URL) {
//       throw new Error("MONGO_URL is not defined in environment variables");
//     }

//     const connectionInstance = await mongoose.connect(process.env.MONGO_URL);

//     console.log(`\nMongoDB connected! DB host: ${connectionInstance.connection.host}`);
//   } catch (error) {
//     console.error("MongoDB connection failed:", error);
//     process.exit(1);
//   }
// };



import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    // 2. Force IPv4 (Fixes the Node 22/24 Windows bug)
    const connectionInstance = await mongoose.connect(process.env.MONGO_URL, {
      family: 4, 
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`\nMongoDB connected! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};



// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

export default connectDB;