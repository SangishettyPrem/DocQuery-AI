import axios, { AxiosError, AxiosInstance } from "axios";
import {
  UploadResponse,
  QueryResponse,
  ApiErrorResponse,
  DocumentItem,
  GetDocumentsResponse,
  DocumentChunkDetail,
} from "@/types";

const FALLBACK_MESSAGE =
  "I am sorry, but the answer to that question is not available in the uploaded document.";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    Accept: "application/json",
  },
});

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const customError: ApiErrorResponse = {
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred during API communication.",
      status: error.response?.status,
    };
    return Promise.reject(customError);
  },
);

export const docuQueryApi = {
  /**
   * Fetch all indexed documents directly from MongoDB backend
   */
  async getDocuments(): Promise<DocumentItem[]> {
    const response =
      await apiClient.get<GetDocumentsResponse>("/api/v1/documents");
    return response.data.documents || [];
  },

  /**
   * Upload and process a new raw document (.txt, .md, .csv)
   */
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<any>(
      "/api/v1/documents/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const raw = response.data;
    const docData = raw.data || raw;

    return {
      success: raw.success ?? true,
      message: raw.message,
      documentId: raw.documentId || docData.documentId,
      fileName: raw.fileName || docData.fileName || file.name,
      fileSize: raw.fileSize || docData.fileSize || file.size,
      chunkCount:
        raw.chunkCount || docData.chunkCount || docData.totalChunks || 0,
      data: docData,
    };
  },

  /**
   * Ask questions strictly restricted to document context
   */
  async queryDocument(
    documentId: string,
    question: string,
  ): Promise<QueryResponse> {
    const response = await apiClient.post<QueryResponse>(
      "/api/v1/documents/query",
      {
        documentId,
        question: question.trim(),
      },
    );

    return response.data;
  },

  /**
   * Delete a document and all its chunks from MongoDB
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/v1/documents/${documentId}`,
    );
    return response.data.success;
  },

  /**
   * Verification helper for unanswerable fallback strings
   */
  isOutOfScopeAnswer(text: string): boolean {
    return text.trim().toLowerCase().includes(FALLBACK_MESSAGE.toLowerCase());
  },
};
