import mongoose, { Document, Schema } from "mongoose";

export interface IDocument extends Document {
  documentId: string;
  fileName: string;
  fileSize: number;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    documentId: {
      type: String,
      required: [true, "documentId is required"],
      unique: true,
      index: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, "fileName is required"],
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "documents",
    timestamps: true,
    versionKey: false,
  },
);

export const DocumentModel = mongoose.model<IDocument>(
  "Document",
  DocumentSchema,
);
