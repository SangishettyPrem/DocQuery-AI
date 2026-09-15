import dotenv from "dotenv";
import { z } from "zod";

// Load variables from .env file
dotenv.config();

const envSchema = z
  .object({
    PORT: z
      .string()
      .default("3000")
      .transform((val) => parseInt(val, 10)),
    MONGO_URI: z
      .string()
      .min(1, "MONGO_URI is required to connect to MongoDB Atlas"),
    VECTOR_INDEX_NAME: z.string().default("vector_index"),
    AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    ALLOWED_ORIGINS: z
      .string({ required_error: "ALLOWED_ORIGINS is required" })
      .transform((val) => val.split(",").map((origin) => origin.trim())),
  })
  .refine(
    (data) => {
      if (data.AI_PROVIDER === "gemini" && !data.GEMINI_API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: 'GEMINI_API_KEY is required when AI_PROVIDER is set to "gemini"',
      path: ["GEMINI_API_KEY"],
    },
  )
  .refine(
    (data) => {
      if (data.AI_PROVIDER === "openai" && !data.OPENAI_API_KEY) {
        return false;
      }
      return true;
    },
    {
      message: 'OPENAI_API_KEY is required when AI_PROVIDER is set to "openai"',
      path: ["OPENAI_API_KEY"],
    },
  );

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "❌ Environment validation failed with the following errors:",
    );
    result.error.errors.forEach((err) => {
      console.error(`   - [${err.path.join(".")}]: ${err.message}`);
    });
    console.error(
      "\nPlease check your .env file against .env.example before starting.\n",
    );
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
