import mongoose, { Document, Schema } from "mongoose";

export interface IDocumentChunk extends Document {
  documentId: string;
  fileName: string;
  textChunk: string;
  embeddings: number[];
  chunkIndex: number;
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    documentId: {
      type: String,
      required: [true, "documentId is required"],
      index: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, "fileName is required"],
      trim: true,
    },
    textChunk: {
      type: String,
      required: [true, "textChunk is required"],
    },
    embeddings: {
      type: [Number],
      required: [true, "embeddings array is required"],
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "document_chunks",
    versionKey: false,
  },
);

// Index documentId and chunkIndex for fast deterministic lookups
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const DocumentChunk = mongoose.model<IDocumentChunk>(
  "DocumentChunk",
  DocumentChunkSchema,
);
