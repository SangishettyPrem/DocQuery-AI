"use client";

import React, { useState } from "react";
import { DocumentItem } from "@/types";
import {
  FileText,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  X,
  Plus,
  RotateCw,
  Layers,
  Loader2,
} from "lucide-react";

interface SidebarHistoryProps {
  documents: DocumentItem[];
  activeDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onRemoveDocument: (documentId: string) => Promise<void> | void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenUploadModal: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  onRemoveDocument,
  isOpenMobile,
  onCloseMobile,
  onOpenUploadModal,
  isLoading = false,
  onRefresh,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " • " +
        d.toLocaleDateString([], { month: "short", day: "numeric" })
      );
    } catch {
      return "Recently";
    }
  };

  const handleDelete = async (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    if (deletingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this document and all its indexed vector chunks from MongoDB?",
    );
    if (!confirmed) return;

    try {
      setDeletingId(documentId);
      await onRemoveDocument(documentId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed lg:static top-0 bottom-0 left-0 z-50
          w-72 sm:w-80 lg:w-80 flex-shrink-0 bg-surface-100 border-r border-white/10
          flex flex-col h-full transition-transform duration-300 ease-in-out
          ${isOpenMobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-brand-400" />
              Database Documents
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>
                {documents.length}{" "}
                {documents.length === 1 ? "source indexed" : "sources indexed"}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
                title="Refresh documents from MongoDB"
              >
                <RotateCw
                  size={14}
                  className={isLoading ? "animate-spin text-brand-400" : ""}
                />
              </button>
            )}

            {/* Quick Upload Trigger on Mobile Sidebar */}
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenUploadModal();
              }}
              className="lg:hidden p-1.5 rounded-lg bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 transition flex items-center gap-1 text-xs font-medium"
              title="Upload new document"
            >
              <Plus size={14} />
              <span className="text-[11px]">Upload</span>
            </button>

            {/* Close Button on Mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Upload Banner for Tablet/Mobile */}
        <div className="p-3 border-b border-white/5 lg:hidden bg-surface-200/40">
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenUploadModal();
            }}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 active:scale-[0.98] transition"
          >
            <Plus size={14} />
            <span>Upload New Document</span>
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Active Syncing Pill (when documents already loaded) */}
          {isLoading && documents.length > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-between text-[11px] text-brand-300 animate-pulse mb-2">
              <span className="flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin text-brand-400" />
                Syncing with MongoDB...
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping" />
            </div>
          )}

          {isLoading && documents.length === 0 ? (
            <div className="space-y-2.5 animate-pulse">
              <div className="px-1 py-1 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Loader2 size={12} className="animate-spin text-brand-400" />
                  Loading documents...
                </span>
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-white/5 bg-surface-200/40 space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-4/5 bg-white/10 rounded" />
                      <div className="h-2 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <div className="h-2.5 w-16 bg-white/10 rounded" />
                    <div className="h-2.5 w-12 bg-white/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-white/10 text-slate-400">
              <FileText size={28} className="text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-300">
                No documents in database
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload a .txt, .md, or .csv file to store chunks and start
                querying.
              </p>
            </div>
          ) : (
            documents.map((doc, index) => {
              const isActive = doc.documentId === activeDocumentId;
              const isDeletingThis = deletingId === doc.documentId;

              return (
                <div
                  key={doc.documentId || index}
                  onClick={() => {
                    onSelectDocument(doc);
                    onCloseMobile();
                  }}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/10"
                      : "bg-surface-200/60 border-white/5 hover:border-white/20 hover:bg-surface-50/50"
                  } ${isDeletingThis ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? "bg-brand-500 text-white"
                            : "bg-white/5 text-slate-400 group-hover:text-white"
                        }`}
                      >
                        <FileText size={14} />
                      </div>
                      <span
                        className="text-xs font-semibold text-slate-200 truncate"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, doc.documentId)}
                      disabled={isDeletingThis}
                      title="Delete document and vector chunks from MongoDB"
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                    >
                      {isDeletingThis ? (
                        <Loader2
                          size={13}
                          className="animate-spin text-rose-400"
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                      <Layers size={10} />
                      <span>
                        {doc.chunkCount
                          ? `${doc.chunkCount} chunks`
                          : "Chunks in DB"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatSize(doc.fileSize)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(doc.uploadedAt)}
                    </span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 size={11} />
                        Active
                      </span>
                    ) : (
                      <ChevronRight
                        size={13}
                        className="text-slate-600 group-hover:text-slate-400 transition"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
