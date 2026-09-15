# DocuQuery AI — Next.js 15 Frontend Dashboard

Modern, dark-themed **Next.js 15 (App Router)** interactive dashboard for the **DocuQuery AI** vector RAG platform.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

---

## 🚀 Features

- **Context-Isolated Chat**: Question answering strictly bound to indexed document chunks with zero-hallucination alerts.
- **Drag & Drop Ingestion**: Interactive dropzone supporting `.txt`, `.md`, and `.csv` files with a simulated 4-stage pipeline (reading ➔ chunking ➔ embedding ➔ indexed).
- **Direct MongoDB Database Sync**: Automatically fetches indexed documents directly from the Express/MongoDB backend (no `localStorage` dependency).
- **Database Deletion**: Removing a document from the sidebar triggers a backend call that deletes both the document metadata and its vector chunks from MongoDB.
- **Sleek Skeleton Loaders**: Animated skeleton cards prevent layout shift while synchronizing with MongoDB Atlas.
- **Strict Mode Deduplication**: Built-in request deduplication guards prevent duplicate network requests on page reloads.
- **Citation Badges**: Displays source chunk indexes and cosine similarity confidence scores for every answer.
- **Copy to Clipboard**: Quick answer export with visual confirmation.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** Strict TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **Icons:** Lucide React
- **HTTP Client:** Axios with centralized error formatting interceptors

---

## 🏁 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in this directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
