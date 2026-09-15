import app from "./app";
import { env } from "./config/env.config";
import { connectDB, disconnectDB } from "./config/db.config";

const bootstrap = async (): Promise<void> => {
  // Connect to MongoDB Atlas
  await connectDB();

  // Start HTTP Server
  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown handlers
  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log("🛑 HTTP Server stopped accepting connections.");
      await disconnectDB();
      console.log("✅ Graceful shutdown completed. Exiting process.");
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      console.error("⚠️  Forceful shutdown initiated after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
};

bootstrap().catch((error) => {
  console.error("Fatal initialization error:", error);
  process.exit(1);
});
