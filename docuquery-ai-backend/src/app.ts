import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import documentRoutes from "./routes/document.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { notFound } from "./middlewares/notfound.middleware";

const app: Application = express();

// Security & Parsing Middlewares
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(morgan("short"));

// Root landing route with quick links
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    service: "DocuQuery AI",
    status: "online",
    description:
      "RAG API with MongoDB Atlas Vector Search & Context-Restricted LLM Completion",
  });
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  });
});

// Mount Document API routes
app.use("/api/v1/documents", documentRoutes);

// 404 Catch-all handler
app.use(notFound);
// Global Error Handler Middleware
app.use(errorHandler);

export default app;
