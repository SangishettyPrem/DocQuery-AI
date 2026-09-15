"use client";

import React, { useState, useRef, useEffect } from "react";
import { DocumentItem, ChatMessage } from "@/types";
import { docuQueryApi } from "@/services/api.service";
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  Info,
  MessageSquare,
  UploadCloud,
  Menu,
  Loader2,
  Database,
  Sparkles,
  FileText,
} from "lucide-react";

interface ChatContainerProps {
  activeDocument: DocumentItem | null;
  onOpenUploadModal: () => void;
  onOpenSidebarMobile?: () => void;
  isLoadingDocuments?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  activeDocument,
  onOpenUploadModal,
  onOpenSidebarMobile,
  isLoadingDocuments = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize chat state when active document switches
  useEffect(() => {
    if (activeDocument) {
      setMessages([
        {
          id: "sys-init",
          sender: "ai",
          text: `Document **"${activeDocument.fileName}"** is ready. Ask any question grounded strictly in this document or click a suggested prompt below.`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      inputRef.current?.focus();
    } else {
      setMessages([]);
    }
  }, [activeDocument]);

  // Auto-scroll to latest response
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const submitQuestion = async (userText: string) => {
    if (!userText.trim() || !activeDocument || isLoading) return;

    const userMsgId = "user-" + Date.now();
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text: userText.trim(),
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];

    setMessages(newMessages);
    setInputQuestion("");
    setIsLoading(true);

    try {
      const res = await docuQueryApi.queryDocument(
        activeDocument.documentId,
        userText.trim(),
      );
      const isOutOfBounds = docuQueryApi.isOutOfScopeAnswer(res.answer);

      setMessages((prev) => [
        ...prev,
        {
          id: "ai-" + Date.now(),
          sender: "ai",
          text: res.answer,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isOutOfBounds,
        },
      ]);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        "Error generating contextual response.";
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-err-" + Date.now(),
          sender: "ai",
          text: `Query error: ${msg}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isOutOfBounds: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuestion(inputQuestion);
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // 0. Documents Loading Placeholder
  if (isLoadingDocuments && !activeDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-surface-300/40 animate-fade-in">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shadow-xl shadow-brand-500/10">
            <Database size={28} className="animate-pulse text-brand-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
          </div>
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-white">
          Fetching Documents & Vector Chunks
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed px-4">
          Connecting to MongoDB Atlas backend service...
        </p>
        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
          <Loader2 size={13} className="animate-spin text-brand-400" />
          <span>Synchronizing workspace...</span>
        </div>
      </div>
    );
  }

  // 1. Zero-Selection Placeholder
  if (!activeDocument) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-surface-300/40">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <MessageSquare size={28} className="sm:w-[30px] sm:h-[30px]" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-white">
          No Document Selected
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed px-4">
          Please upload or select a document from the sidebar to begin semantic
          questioning.
        </p>

        {/* Mobile quick action buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition"
          >
            <UploadCloud size={15} />
            <span>Upload Document</span>
          </button>

          {onOpenSidebarMobile && (
            <button
              type="button"
              onClick={onOpenSidebarMobile}
              className="lg:hidden px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-50 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 active:scale-[0.98] transition"
            >
              <Menu size={15} />
              <span>Browse History</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const suggestedQuestions = activeDocument.suggestedQuestions || [];
  const showInitialPrompts = messages.length <= 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-300/30 overflow-hidden">
      {/* Messages Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-2xl ${
              msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${
                msg.sender === "user"
                  ? "bg-brand-600"
                  : "bg-surface-50 border border-white/10 text-brand-400"
              }`}
            >
              {msg.sender === "user" ? (
                <User size={13} className="sm:w-[15px] sm:h-[15px]" />
              ) : (
                <Bot size={14} className="sm:w-4 sm:h-4" />
              )}
            </div>

            {/* Bubble Canvas */}
            <div className="flex flex-col group min-w-0">
              <div
                className={`p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-brand-600 text-white rounded-tr-none"
                    : msg.isOutOfBounds
                      ? "bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded-tl-none"
                      : "bg-surface-100 border border-white/10 text-slate-200 rounded-tl-none"
                }`}
              >
                {/* Out-of-bounds warning badge */}
                {msg.isOutOfBounds && (
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1 text-[11px]">
                    <Info size={13} />
                    <span>Outside Document Context</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Timestamp & Utilities */}
              <div
                className={`mt-1 flex items-center gap-2 text-[10px] text-slate-500 px-1 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.sender === "ai" && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="hover:text-slate-300 transition flex items-center gap-1"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Interactive Starter Questions Panel (shown when user hasn't asked a question yet) */}
        {showInitialPrompts && suggestedQuestions.length > 0 && (
          <div className="my-3 sm:my-4 p-4 rounded-2xl bg-surface-100/80 border border-white/10 backdrop-blur-sm max-w-2xl animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-300 mb-1.5">
              <Sparkles size={15} className="text-brand-400" />
              <span>Suggested Questions to Explore</span>
            </div>

            {activeDocument.summary && (
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                {activeDocument.summary}
              </p>
            )}

            <div className="flex flex-col gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => submitQuestion(q)}
                  className="flex items-center gap-2.5 p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-surface-200/70 hover:bg-brand-500/15 border border-white/5 hover:border-brand-500/40 text-left text-xs text-slate-300 hover:text-white transition group shadow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="w-5 h-5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold shrink-0 group-hover:bg-brand-500 group-hover:text-white transition">
                    {idx + 1}
                  </span>
                  <span className="line-clamp-2 leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing / Computing Indicator */}
        {isLoading && (
          <div className="flex gap-2 sm:gap-3 max-w-md mr-auto">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-surface-50 border border-white/10 text-brand-400 flex items-center justify-center flex-shrink-0">
              <Bot size={15} />
            </div>
            <div className="bg-surface-100 border border-white/10 rounded-2xl rounded-tl-none px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Persistent Quick Suggestions Carousel (when user has active chat history) */}
      {!showInitialPrompts && suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-surface-200/30 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-brand-400" />
            Try:
          </span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => submitQuestion(q)}
              className="text-[11px] text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-surface-100/80 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500/30 whitespace-nowrap transition shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Canvas */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-surface-100/60 backdrop-blur">
        <form
          onSubmit={handleSend}
          className="relative flex items-center max-w-4xl mx-auto"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={isLoading}
            placeholder={`Ask a question based on ${activeDocument.fileName}...`}
            className="w-full bg-surface-200 border border-white/15 focus:border-brand-500 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 pr-20 sm:pr-24 text-xs text-white placeholder-slate-500 outline-none transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            className="absolute right-1.5 sm:right-2 px-2.5 sm:px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-lg shadow-brand-500/20"
          >
            <span>Ask</span>
            <Send size={11} className="sm:w-3 sm:h-3" />
          </button>
        </form>
        <p className="text-center text-[9px] sm:text-[10px] text-slate-500 mt-1.5 sm:mt-2">
          Responses are strictly synthesized from indexed vector chunks without
          external hallucinations.
        </p>
      </div>
    </div>
  );
};