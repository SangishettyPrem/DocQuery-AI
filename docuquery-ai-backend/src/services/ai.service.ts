import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { env } from "../config/env.config";

/**
 * Text Chunker implementation
 * Splits text into overlapping chunks of approx chunkSize characters with overlap
 * Prioritizes natural sentence or paragraph boundaries when possible.
 */
export const chunkText = (
  text: string,
  chunkSize = 500,
  overlap = 100,
): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize line endings and whitespace
  const sanitized = text.replace(/\r\n/g, "\n").trim();

  if (sanitized.length <= chunkSize) {
    return [sanitized];
  }

  const chunks: string[] = [];
  let startIndex = 0;
  const step = chunkSize - overlap;

  while (startIndex < sanitized.length) {
    let endIndex = startIndex + chunkSize;

    // If we're not at the very end of the text, try to slice cleanly at sentence / whitespace boundary
    if (endIndex < sanitized.length) {
      // Look for a newline, period, question mark, or space within the last 50 chars of the window
      const searchWindowStart = Math.max(startIndex + overlap, endIndex - 50);
      const windowSlice = sanitized.slice(searchWindowStart, endIndex);

      const naturalBreakIndex = Math.max(
        windowSlice.lastIndexOf("\n"),
        windowSlice.lastIndexOf(". "),
        windowSlice.lastIndexOf("? "),
        windowSlice.lastIndexOf("! "),
        windowSlice.lastIndexOf(" "),
      );

      if (naturalBreakIndex !== -1) {
        endIndex = searchWindowStart + naturalBreakIndex + 1;
      }
    } else {
      endIndex = sanitized.length;
    }

    const chunk = sanitized.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (endIndex >= sanitized.length) {
      break;
    }

    startIndex += step;
  }

  return chunks;
};

// Singleton AI Client instances
let geminiClient: GoogleGenerativeAI | null = null;
let openaiClient: OpenAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!geminiClient) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment.");
    }
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
};

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured in environment.");
    }
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
};

/**
 * Generate vector embeddings for an individual string chunk.
 * Supports Google Gemini text-embedding-004 (768 dims) and OpenAI text-embedding-3-small (1536 dims).
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    if (env.AI_PROVIDER === "gemini") {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: "gemini-embedding-2" });
      const result = await model.embedContent(text);

      if (!result.embedding || !result.embedding.values) {
        throw new Error("Gemini API did not return embedding values.");
      }

      return result.embedding.values;
    } else {
      const client = getOpenAIClient();
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("OpenAI API did not return embedding data.");
      }

      return response.data[0].embedding;
    }
  } catch (error: any) {
    console.error("Embedding generation failed:", error?.message || error);
    if (
      error?.status === 429 ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("quota")
    ) {
      throw new Error(
        "AI Provider rate limit / quota exceeded. Please verify your API key limits or try again shortly.",
      );
    }
    if (error?.status === 401 || error?.message?.includes("API_KEY_INVALID")) {
      throw new Error(
        "Invalid AI API key. Please check your credentials in .env.",
      );
    }
    throw new Error(
      `Failed to generate embedding: ${error?.message || "Unknown provider error"}`,
    );
  }
};

/**
 * Batch generate embeddings with slight pacing to respect rate limits.
 */
export const generateEmbeddingsBatch = async (
  chunks: string[],
  concurrency = 5,
): Promise<number[][]> => {
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((chunk) => generateEmbedding(chunk)),
    );
    embeddings.push(...batchResults);
  }

  return embeddings;
};

export const STRICT_SYSTEM_PROMPT =
  "Answer the user's question using ONLY the provided text context block. If the answer cannot be found or deduced from the context block, respond exactly with: 'I am sorry, but the answer to that question is not available in the uploaded document.' Do not make up information or hallucinate outside the text boundaries.";

/**
 * Generate contextual LLM answer given retrieved chunks and the user's question.
 */
export const generateAnswerFromContext = async (
  context: string,
  question: string,
): Promise<string> => {
  if (!context || context.trim().length === 0) {
    return "I am sorry, but the answer to that question is not available in the uploaded document.";
  }

  const prompt = `System Instruction:
                  ${STRICT_SYSTEM_PROMPT}
                  Context:
                  """
                    ${context}
                  """
                  User Question: ${question}
                  Answer:`;

  try {
    if (env.AI_PROVIDER === "gemini") {
      const client = getGeminiClient();

      // 1. Define your model hierarchy
      const PRIMARY_MODEL = "gemini-3.8-flash";
      const FALLBACK_MODEL = "gemini-3.5-flash-lite"; // Highly available stable model

      let result;
      try {
        // 2. Try the primary model first
        const model = client.getGenerativeModel({
          model: PRIMARY_MODEL,
          systemInstruction: prompt,
        });

        result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Context:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
                },
              ],
            },
          ],
        });
      } catch (error: any) {
        // 3. Intercept the 503 / high demand error and try the fallback model
        console.warn(
          `Primary model (${PRIMARY_MODEL}) failed. Attempting fallback...`,
          error.message || error,
        );

        try {
          const fallbackModel = client.getGenerativeModel({
            model: FALLBACK_MODEL,
            systemInstruction: prompt,
          });

          result = await fallbackModel.generateContent({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Context:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
                  },
                ],
              },
            ],
          });
        } catch (fallbackError) {
          // Both models failed
          console.error(
            "Both primary and fallback models failed:",
            fallbackError,
          );
          throw fallbackError;
        }
      }

      // 4. Extract and clean the response text
      const responseText = result.response.text();
      return (
        responseText?.trim() ||
        "I am sorry, but the answer to that question is not available in the uploaded document."
      );
    } else {
      const client = getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: STRICT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Context:\n"""\n${context}\n"""\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0.1, // Near deterministic to eliminate hallucinations
      });

      const responseText = completion.choices[0]?.message?.content;
      return (
        responseText?.trim() ||
        "I am sorry, but the answer to that question is not available in the uploaded document."
      );
    }
  } catch (error: any) {
    console.error("LLM answer generation failed:", error?.message || error);
    if (
      error?.status === 429 ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("quota")
    ) {
      throw new Error(
        "AI Provider rate limit / quota exceeded during completion. Please try again shortly.",
      );
    }
    throw new Error(
      `Failed to generate LLM response: ${error?.message || "Unknown error"}`,
    );
  }
};
