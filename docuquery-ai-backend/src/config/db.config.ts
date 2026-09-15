import mongoose from "mongoose";
import { env } from "./env.config";

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected successfully to Atlas.");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error(
      "Failed to establish initial connection to MongoDB Atlas ",
      error,
    );
  }
};

/**
 * Graceful database disconnect
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("🔌 MongoDB connection closed cleanly.");
  } catch (error) {
    console.error("Error during MongoDB disconnect:", error);
  }
};
