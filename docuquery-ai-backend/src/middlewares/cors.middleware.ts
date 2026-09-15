import { type CorsOptions } from "cors";
import { env } from "../config/env.config";

const whiteListedIp = env.ALLOWED_ORIGINS;

export const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin || whiteListedIp.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not Allowed By CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200,
  allowedHeaders: ["Content-Type", "Authorization"],
};
