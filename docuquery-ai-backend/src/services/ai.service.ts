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

/**
 * Pre-configured questions for known sample files
 */
const SAMPLE_PRESETS: Record<string, { summary: string; questions: string[] }> =
  {
    "acme_corp_q3_financial_report.md": {
      summary:
        "ACME Corporation Q3 financial performance, revenue growth, operating margins, and Q4 outlook.",
      questions: [
        "What was the total revenue in Q3 and what drove the growth?",
        "What are the revenue projections and capital expenditures for Q4?",
        "How much cash reserves did ACME end the quarter with?",
      ],
    },
    "employee_handbook_remote_policy.md": {
      summary:
        "GlobalTech Innovations remote work policies, equipment stipends, working hours, and paid leave.",
      questions: [
        "What is the home office setup allowance and monthly internet subsidy?",
        "What are the core working hours and meeting-free guidelines?",
        "How many weeks of paid parental leave are provided for primary caregivers?",
      ],
    },
    "cloud_architecture_security_specs.txt": {
      summary:
        "Apex-Gateway cloud topology, JWT authentication, rate limiting, and disaster recovery objectives.",
      questions: [
        "What is the token expiration window and key rotation interval?",
        "What are the RPO and RTO disaster recovery objectives?",
        "What are the rate limits for unauthenticated and authenticated API tiers?",
      ],
    },
    "product_catalog_sales_data.csv": {
      summary:
        "Product catalog inventory, pricing, customer ratings, suppliers, and warranty terms.",
      questions: [
        "Which supplier produces the 4K Gaming Monitor and what is its warranty?",
        "What is the unit price and inventory count for the Smart Water Bottle?",
        "Which products have a customer rating of 4.8 or higher?",
      ],
    },
    "medical_clinical_trial_summary.txt": {
      summary:
        "Phase-3 trial evaluation of Neuro-Calm (NC-408) for Treatment-Resistant Major Depressive Disorder.",
      questions: [
        "What was the reduction in MADRS score for the 50mg cohort compared to placebo?",
        "What were the most frequently reported adverse side effects?",
        "What percentage of participants in the 50mg cohort achieved full clinical remission?",
      ],
    },
  };

/**
 * Generates starter questions and a summary for any uploaded document.
 */
export const generateDocumentInsights = async (
  fileName: string,
  sampleText: string,
): Promise<{ summary: string; questions: string[] }> => {
  // 1. Check presets for instant, curated questions on demo files
  const normalizedName = fileName.toLowerCase().trim();
  for (const [presetKey, presetData] of Object.entries(SAMPLE_PRESETS)) {
    if (
      normalizedName.includes(presetKey.toLowerCase()) ||
      presetKey.toLowerCase().includes(normalizedName)
    ) {
      return presetData;
    }
  }

  // 2. Default fallback questions if LLM generation fails or sample is short
  const defaultFallback = {
    summary: `Document: ${fileName}`,
    questions: [
      `What is the primary objective or topic discussed in ${fileName}?`,
      "What are the key findings or data points mentioned?",
      "What are the main conclusions or recommendations?",
    ],
  };

  if (!sampleText || sampleText.trim().length === 0) {
    return defaultFallback;
  }

  const promptText = `Analyze the following document preview and generate:
1. A concise 1-sentence summary of what this document is about.
2. Exactly 3 short, specific questions that a reader could ask that can be answered from this document.

Respond ONLY with valid JSON in this exact structure:
{
  "summary": "1-sentence summary here.",
  "questions": [
    "Specific question 1?",
    "Specific question 2?",
    "Specific question 3?"
  ]
}

Document Preview:
"""
${sampleText.slice(0, 1500)}
"""`;

  try {
    if (env.AI_PROVIDER === "gemini") {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const response = await model.generateContent(promptText);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return {
          summary: parsed.summary || defaultFallback.summary,
          questions: parsed.questions.slice(0, 3),
        };
      }
    } else {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptText }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const text = response.choices[0]?.message?.content;
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return {
            summary: parsed.summary || defaultFallback.summary,
            questions: parsed.questions.slice(0, 3),
          };
        }
      }
    }
  } catch (error) {
    console.warn(
      `⚠️ Could not generate automated insights for ${fileName}. Using smart defaults.`,
    );
  }

  return defaultFallback;
};
