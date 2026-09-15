import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { DocumentChunk } from "../models/chunk.model";
import { DocumentModel } from "../models/document.model";
import {
  chunkText,
  generateEmbedding,
  generateEmbeddingsBatch,
  generateAnswerFromContext,
} from "../services/ai.service";
import {
  searchSimilarChunks,
  compileContextBlock,
} from "../services/vector.service";

const querySchema = z.object({
  documentId: z.string().min(1, "documentId is required and must not be empty"),
  question: z.string().min(2, "question must be at least 2 characters long"),
});

export const uploadDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "Bad Request",
        message:
          'No file uploaded. Please supply a file in the "file" field (supported: .txt, .md, .csv).',
      });
      return;
    }

    const { originalname, buffer } = req.file;
    const allowedExtensions = [".txt", ".md", ".csv"];
    const hasValidExtension = allowedExtensions.some((ext) =>
      originalname.toLowerCase().endsWith(ext),
    );

    if (!hasValidExtension) {
      res.status(400).json({
        success: false,
        error: "Unsupported Media Type",
        message: `Unsupported file type: ${originalname}. Supported formats are: ${allowedExtensions.join(", ")}`,
      });
      return;
    }

    const fileContent = buffer.toString("utf-8");
    if (!fileContent || fileContent.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Empty Document",
        message:
          "The uploaded file is empty. Please provide a document with text content.",
      });
      return;
    }

    const documentId = uuidv4();
    const chunks = chunkText(fileContent, 500, 100);
    const embeddingsList = await generateEmbeddingsBatch(chunks, 5);
    const chunkDocs = chunks.map((chunk, index) => ({
      documentId,
      fileName: originalname,
      textChunk: chunk,
      embeddings: embeddingsList[index],
      chunkIndex: index,
      createdAt: new Date(),
    }));

    await DocumentChunk.insertMany(chunkDocs);
    await DocumentModel.findOneAndUpdate(
      { documentId },
      {
        documentId,
        fileName: originalname,
        fileSize: buffer.length,
        chunkCount: chunks.length,
        createdAt: new Date(),
      },
      { upsert: true, new: true },
    );

    res.status(201).json({
      success: true,
      message:
        "Document successfully uploaded, chunked, embedded, and indexed.",
      documentId,
      fileName: originalname,
      fileSize: buffer.length,
      chunkCount: chunks.length,
      data: {
        documentId,
        fileName: originalname,
        fileSize: buffer.length,
        chunkCount: chunks.length,
        totalChunks: chunks.length,
        embeddingDimensions: embeddingsList[0]?.length || 0,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message:
        "An error occurred while processing your document. Please try again later.",
    });
    return;
  }
};

// Handles semantic document queries
export const queryDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Validate request body
    const validation = querySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "Invalid Request Body",
        issues: validation.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const { documentId, question } = validation.data;

    // 1. Verify that the document exists in MongoDB
    const chunkCount = await DocumentChunk.countDocuments({ documentId });
    if (chunkCount === 0) {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: `No document chunks found for documentId: "${documentId}". Please verify the ID or upload the document first.`,
      });
      return;
    }

    // 2. Generate mathematical vector for the user's question
    const questionVector = await generateEmbedding(question);

    // 3. Search top 3 closest matching chunks via MongoDB $vectorSearch (Cosine Similarity)
    const topChunks = await searchSimilarChunks(documentId, questionVector, 3);

    if (topChunks.length === 0) {
      res.status(200).json({
        success: true,
        documentId,
        question,
        answer:
          "I am sorry, but the answer to that question is not available in the uploaded document.",
        sources: [],
      });
      return;
    }

    // 4. Extract textChunk values and compile into unified context string block
    const contextBlock = compileContextBlock(topChunks);
    // 5. Feed context block into LLM completion with strict non-hallucination instruction
    const aiAnswer = await generateAnswerFromContext(contextBlock, question);

    res.status(200).json({
      success: true,
      documentId,
      question,
      answer: aiAnswer,
      sources: topChunks.map((chunk, idx) => ({
        rank: idx + 1,
        chunkIndex: chunk.chunkIndex,
        similarityScore:
          chunk.score !== undefined ? Number(chunk.score.toFixed(4)) : null,
        preview: chunk.textChunk,
      })),
    });
  } catch (error) {
    console.error("Error querying document:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message:
        "An error occurred while querying the document. Please try again later.",
    });
    return;
  }
};

// loading all the documents from the database.
export const getAllDocuments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // 1. Get documents from DocumentModel
  try {
    const documents = await DocumentModel.find().sort({ createdAt: -1 }).lean();
    const filteredDocuments = documents
      .filter((doc) => doc.chunkCount > 0)
      .map((doc) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        chunkCount: doc.chunkCount,
        uploadedAt: new Date(doc.createdAt).toISOString(),
      }));

    res.status(200).json({
      success: true,
      documents: filteredDocuments,
    });
    return;
  } catch (error) {
    console.error("Error loading documents from MongoDB:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message:
        "An error occurred while loading documents. Please try again later.",
    });
    return;
  }
};

// Deleting a document from the database.
export const deleteDocument = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { documentId } = req.params;

  if (!documentId) {
    res.status(400).json({
      success: false,
      error: "Bad Request",
      message: "documentId URL parameter is required.",
    });
    return;
  }

  // 1. Delete all chunks belonging to documentId
  const chunkResult = await DocumentChunk.deleteMany({ documentId });

  // 2. Delete document metadata
  const docResult = await DocumentModel.deleteOne({ documentId });

  if (chunkResult.deletedCount === 0 && docResult.deletedCount === 0) {
    res.status(404).json({
      success: false,
      error: "Not Found",
      message: `Document "${documentId}" not found in database.`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Document "${documentId}" and ${chunkResult.deletedCount} associated chunks deleted from database.`,
    documentId,
    deletedChunks: chunkResult.deletedCount,
  });
  return;
};
