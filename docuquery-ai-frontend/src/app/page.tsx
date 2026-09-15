"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { DocumentItem } from "@/types";
import { SidebarHistory } from "@/components/sidebar-history";
import { DocumentUpload } from "@/components/document-upload";
import { ChatContainer } from "@/components/chat-container";
import { docuQueryApi } from "@/services/api.service";
import {
  Sparkles,
  Database,
  ShieldCheck,
  Menu,
  UploadCloud,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadBannerExpanded, setIsUploadBannerExpanded] = useState(true);

  const isFetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const loadDocuments = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoadingDocuments(true);

    try {
      const docs = await docuQueryApi.getDocuments();
      setDocuments(docs);

      setActiveDocumentId((currentActive) => {
        if (currentActive && docs.some((d) => d.documentId === currentActive)) {
          return currentActive;
        }
        return docs.length > 0 ? docs[0].documentId : null;
      });
    } catch (e) {
      console.error("Failed to load documents from backend:", e);
    } finally {
      setIsLoadingDocuments(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    loadDocuments();
  }, [loadDocuments]);

  const handleDocumentUploaded = (newDoc: DocumentItem) => {
    setDocuments((prev) => [
      newDoc,
      ...prev.filter((d) => d.documentId !== newDoc.documentId),
    ]);
    setActiveDocumentId(newDoc.documentId);
    setIsUploadModalOpen(false);

    loadDocuments();
  };

  const handleRemoveDocument = async (id: string) => {
    try {
      await docuQueryApi.deleteDocument(id);
      const updated = documents.filter((d) => d.documentId !== id);
      setDocuments(updated);

      if (activeDocumentId === id) {
        setActiveDocumentId(updated.length > 0 ? updated[0].documentId : null);
      }
    } catch (err) {
      console.error(`Failed to delete document ${id} from MongoDB:`, err);
      alert(
        "Failed to delete document from database. Please check your backend connection.",
      );
    }
  };

  const activeDoc =
    documents.find((d) => d.documentId === activeDocumentId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Top Application Navbar */}
      <header className="h-14 border-b border-white/10 bg-surface-100/90 backdrop-blur px-4 sm:px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(true)}
            className="lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
            title="Open documents menu"
          >
            <Menu size={20} />
          </button>

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                DocuQuery <span className="text-brand-400">AI</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs text-slate-400">
          <div className="hidden md:flex items-center gap-1.5">
            <Database size={13} className="text-brand-400" />
            <span>MongoDB Atlas Vectors</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Zero-Hallucination</span>
          </div>

          {/* Dedicated Upload Button visible across all viewports */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-brand-500/20 active:scale-95 transition"
          >
            <UploadCloud size={14} />
            <span className="hidden sm:inline">Upload Document</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop fixed, Mobile/Tablet slide-over drawer) */}
        <SidebarHistory
          documents={documents}
          activeDocumentId={activeDocumentId}
          onSelectDocument={(doc) => setActiveDocumentId(doc.documentId)}
          onRemoveDocument={handleRemoveDocument}
          isOpenMobile={isSidebarOpenMobile}
          onCloseMobile={() => setIsSidebarOpenMobile(false)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          isLoading={isLoadingDocuments}
          onRefresh={loadDocuments}
        />

        {/* Center/Right Workspace Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
          {/* Collapsible Ingestion Zone Banner on Desktop / Tablet */}
          <div className="hidden md:block border-b border-white/10 bg-surface-200/40 flex-shrink-0 transition-all">
            <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-white/5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UploadCloud size={14} className="text-brand-400" />
                Ingestion Dropzone
              </span>
              <button
                type="button"
                onClick={() =>
                  setIsUploadBannerExpanded(!isUploadBannerExpanded)
                }
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
              >
                <span>{isUploadBannerExpanded ? "Minimize" : "Expand"}</span>
                {isUploadBannerExpanded ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            </div>
            {isUploadBannerExpanded && (
              <div className="p-3 sm:p-4">
                <DocumentUpload
                  onDocumentUploaded={handleDocumentUploaded}
                  compact={true}
                />
              </div>
            )}
          </div>

          {/* Context Chat Canvas */}
          <ChatContainer
            activeDocument={activeDoc}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onOpenSidebarMobile={() => setIsSidebarOpenMobile(true)}
            isLoadingDocuments={isLoadingDocuments}
          />
        </div>
      </div>

      {/* Responsive Universal Upload Modal (for Mobile, Tablet, or Quick Access) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-surface-100 border border-white/15 rounded-2xl shadow-2xl p-4 sm:p-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Upload New Document
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Extracts chunks and generates vector embeddings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Ingestion Component inside Modal */}
            <DocumentUpload
              onDocumentUploaded={handleDocumentUploaded}
              compact={false}
            />

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Supports .txt, .md, .csv (Max 10MB)</span>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
