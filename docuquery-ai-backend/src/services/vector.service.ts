import { DocumentChunk, IDocumentChunk } from "../models/chunk.model";
import { env } from "../config/env.config";

export interface RetrievedChunk {
  _id: string;
  documentId: string;
  fileName: string;
  textChunk: string;
  chunkIndex: number;
  score?: number;
}

/**
 * Calculate Cosine Similarity between two vectors in memory (used as fail-safe fallback).
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
};

/**
 * Executes Vector Search in MongoDB Atlas using the native $vectorSearch aggregation stage.
 * Falls back to in-memory cosine ranking if Atlas Vector Index is still building or not configured.
 */
export const searchSimilarChunks = async (
  documentId: string,
  questionVector: number[],
  topK = 3,
): Promise<RetrievedChunk[]> => {
  // 1. Primary: Native MongoDB Atlas $vectorSearch aggregation
  try {
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: env.VECTOR_INDEX_NAME,
          path: "embeddings",
          queryVector: questionVector,
          numCandidates: 10,
          limit: topK,
          filter: {
            documentId: { $eq: documentId },
          },
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          fileName: 1,
          textChunk: 1,
          chunkIndex: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const results =
      await DocumentChunk.aggregate<RetrievedChunk>(pipeline).exec();

    if (results && results.length > 0) {
      return results;
    }

    // If filter didn't match or index is not indexed with filter field, try vector search with $match
    const broadPipeline: any[] = [
      {
        $vectorSearch: {
          index: env.VECTOR_INDEX_NAME,
          path: "embeddings",
          queryVector: questionVector,
          numCandidates: 25,
          limit: 15,
        },
      },
      {
        $match: {
          documentId: documentId,
        },
      },
      {
        $limit: topK,
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          fileName: 1,
          textChunk: 1,
          chunkIndex: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    const broadResults =
      await DocumentChunk.aggregate<RetrievedChunk>(broadPipeline).exec();
    if (broadResults && broadResults.length > 0) {
      return broadResults;
    }
  } catch (error: any) {
    console.warn(
      `⚠️  Atlas $vectorSearch warning: ${error?.message || error}. Falling back to in-memory cosine similarity ranking...`,
    );
  }

  // 2. Resilient In-Memory Fallback
  // If MongoDB is not yet hosted on Atlas or the vector index is in BUILDING state,
  // we retrieve the document chunks and calculate exact cosine similarity.
  const storedChunks = await DocumentChunk.find({ documentId }).lean().exec();

  if (!storedChunks || storedChunks.length === 0) {
    return [];
  }

  const scored = storedChunks.map((chunk) => ({
    _id: String(chunk._id),
    documentId: chunk.documentId,
    fileName: chunk.fileName,
    textChunk: chunk.textChunk,
    chunkIndex: chunk.chunkIndex,
    score: cosineSimilarity(questionVector, chunk.embeddings),
  }));

  // Sort descending by similarity score and take top K
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return scored.slice(0, topK);
};

/**
 * Compiles retrieved chunks into a clean, context string block.
 */
export const compileContextBlock = (chunks: RetrievedChunk[]): string => {
  if (!chunks || chunks.length === 0) {
    return "";
  }

  return chunks
    .map(
      (chunk, idx) =>
        `[Source Chunk ${idx + 1} (Score: ${(chunk.score ?? 0).toFixed(4)})]:\n${chunk.textChunk}`,
    )
    .join("\n\n---\n\n");
};
