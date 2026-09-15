"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { DocumentItem, ProcessingStep } from "@/types";
import { docuQueryApi } from "@/services/api.service";

interface DocumentUploadProps {
  onDocumentUploaded: (doc: DocumentItem) => void;
  compact?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onDocumentUploaded,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = [".txt", ".md", ".csv"];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(
        "Unsupported file format. Please upload .txt, .md, or .csv files.",
      );
      setStep("error");
      return;
    }

    setErrorMessage(null);

    try {
      // Step 1: Read
      setStep("reading");
      await new Promise((r) => setTimeout(r, 450));

      // Step 2: Chunk
      setStep("chunking");
      await new Promise((r) => setTimeout(r, 600));

      // Step 3: Embed & Ingest via API
      setStep("embedding");
      const res = await docuQueryApi.uploadDocument(file);

      // Step 4: Indexing Complete
      setStep("indexed");
      await new Promise((r) => setTimeout(r, 500));

      const newDoc: DocumentItem = {
        documentId: res.documentId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        chunkCount: res.chunkCount,
      };

      onDocumentUploaded(newDoc);
      setStep("idle");
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Failed to process and index document.";
      setErrorMessage(msg);
      setStep("error");
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => step === "idle" && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 text-center ${
          compact ? "p-4 sm:p-5" : "p-4 sm:p-6"
        } ${
          isDragOver
            ? "border-brand-500 bg-brand-500/10 scale-[1.005]"
            : "border-white/15 bg-surface-100/50 hover:border-brand-500/40 hover:bg-surface-100"
        } ${step !== "idle" && step !== "error" ? "cursor-wait pointer-events-none" : "cursor-pointer"}`}
      >
        {/* Idle Mode */}
        {step === "idle" && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-2.5 sm:mb-3 shadow-inner shadow-brand-500/20">
              <UploadCloud size={22} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-white">
              Tap or drag file to{" "}
              <span className="text-brand-400 underline">Upload</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 max-w-sm px-2">
              Ingest contextual text data. Supports <code>.txt</code>,{" "}
              <code>.md</code>, and <code>.csv</code>.
            </p>
            <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                .txt
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                .md
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                .csv
              </span>
            </div>
          </div>
        )}

        {/* Processing Timeline Loop */}
        {step !== "idle" && step !== "error" && (
          <div className="py-2 flex flex-col items-center max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Loader2 className="animate-spin text-brand-400" size={16} />
              <span className="text-xs font-semibold text-white tracking-wide">
                Ingesting to Vector Index...
              </span>
            </div>

            <div className="w-full space-y-1.5 sm:space-y-2 text-left text-xs">
              <div
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  step === "reading"
                    ? "bg-white/10 text-white"
                    : "text-slate-400"
                }`}
              >
                <span>⏳</span>
                <span className="flex-1 text-[11px] sm:text-xs">
                  Reading file contents...
                </span>
                {step !== "reading" && (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 shrink-0"
                  />
                )}
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  step === "chunking"
                    ? "bg-white/10 text-white"
                    : "text-slate-400"
                }`}
              >
                <span>⚙️</span>
                <span className="flex-1 text-[11px] sm:text-xs">
                  Slicing into semantic chunks...
                </span>
                {step !== "reading" && step !== "chunking" && (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 shrink-0"
                  />
                )}
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  step === "embedding"
                    ? "bg-white/10 text-white"
                    : "text-slate-400"
                }`}
              >
                <span>🧠</span>
                <span className="flex-1 text-[11px] sm:text-xs">
                  Generating vector embeddings...
                </span>
                {step === "indexed" && (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 shrink-0"
                  />
                )}
              </div>

              <div
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  step === "indexed"
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-500"
                }`}
              >
                <span>🎉</span>
                <span className="flex-1 text-[11px] sm:text-xs font-medium">
                  File indexing complete!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="flex flex-col items-center py-2">
            <AlertCircle size={24} className="text-rose-400 mb-2" />
            <p className="text-xs font-semibold text-rose-300 px-2">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStep("idle");
              }}
              className="mt-3 text-xs px-3 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-white transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
