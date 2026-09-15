export interface DocumentItem {
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  chunkCount?: number;
}

export interface DocumentChunkDetail {
  chunkIndex: number;
  textChunk: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isOutOfBounds?: boolean;
}

export type ProcessingStep =
  | "idle"
  | "reading"
  | "chunking"
  | "embedding"
  | "indexed"
  | "error";

export interface UploadResponse {
  success: boolean;
  message?: string;
  documentId: string;
  fileName: string;
  fileSize?: number;
  chunkCount?: number;
  data?: {
    documentId: string;
    fileName: string;
    fileSize?: number;
    chunkCount?: number;
    totalChunks?: number;
  };
}

export interface GetDocumentsResponse {
  success: boolean;
  count: number;
  documents?: DocumentItem[];
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sources?: Array<{
    rank?: number;
    chunkIndex?: number;
    similarityScore?: number;
    preview?: string;
    text?: string;
    score?: number;
  }>;
}

export interface ApiErrorResponse {
  message: string;
  status?: number;
}
