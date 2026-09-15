# DocuQuery AI — Full-Stack Vector RAG Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-forestgreen.svg)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-orange.svg)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)

**DocuQuery AI** is an enterprise-ready, context-restricted **Retrieval-Augmented Generation (RAG)** platform designed to ingest raw unstructured documents (`.txt`, `.md`, `.csv`), compute high-dimensional mathematical vector embeddings, store them in **MongoDB Atlas Vector Search**, and deliver grounded, zero-hallucination answers through an interactive Next.js dashboard and Express REST API.

## 📂 Repository Structure

```
DocQuery AI/
├── docuquery-ai-backend/          # Express + TypeScript Microservice
│   ├── sample_documents/          # Ready-to-use sample test documents (.md, .txt, .csv)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.config.ts       # Mongoose connection & connection pool events
│   │   │   └── env.config.ts      # Zod runtime environment variable validation
│   │   ├── controllers/
│   │   │   └── document.controller.ts # Ingestion, querying, listing, and deletion
│   │   ├── middlewares/
│   │   │   ├── async.middleware.ts    # Unhandled async rejection wrapper
│   │   │   └── error.middleware.ts    # Centralized HTTP status code & error handler
│   │   ├── models/
│   │   │   ├── chunk.model.ts     # Mongoose schema for document_chunks
│   │   │   └── document.model.ts  # Mongoose schema for documents metadata
│   │   ├── routes/
│   │   │   └── document.routes.ts # Express router with Multer memory buffer
│   │   ├── services/
│   │   │   ├── ai.service.ts      # Chunker, text-embedding-004 & Gemini LLM
│   │   │   └── vector.service.ts  # MongoDB $vectorSearch pipeline & cosine fallback
│   │   ├── app.ts                 # Express server middleware & routing
│   │   └── server.ts              # Service bootstrap entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
├── docuquery-ai-frontend/         # Next.js 15 + React + Tailwind CSS Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Global fonts and metadata layout
│   │   │   ├── page.tsx           # Main workspace orchestration & state deduping
│   │   │   └── globals.css        # Tailwind custom design tokens and surfaces
│   │   ├── components/
│   │   │   ├── chat-container.tsx # Context-grounded chat canvas & citation badges
│   │   │   ├── document-upload.tsx# Ingestion zone with 4-stage pipeline simulation
│   │   │   └── sidebar-history.tsx# Real-time MongoDB document list & skeleton loaders
│   │   ├── services/
│   │   │   └── api.service.ts     # Axios client with interceptors & typed API endpoints
│   │   └── types/
│   │       └── index.ts           # Strict TypeScript interfaces & API contracts
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
│
└── README.md                      # Master Platform Documentation (this file)
```

---

## 🌟 Core Engineering Features

### 1. Boundary-Aware Semantic Text Chunker

- Splits documents into **~500 character** windows with **100 character overlap** to retain syntactic context across split boundaries.
- Analyzes trailing punctuation (`. `, `\n`, `? `, `! `) in the last 50 characters to break cleanly on natural sentence or paragraph ends.

### 2. High-Dimensional Vector Embeddings

- Converts each text chunk into a **768-dimensional float array** using Google's `text-embedding-004` (or 1536-dimensional with OpenAI `text-embedding-3-small`).
- Batched embedding requests with concurrency controls to respect API rate limits.

### 3. Native MongoDB Atlas `$vectorSearch`

- Employs native Atlas Vector Search using **Cosine Similarity**:
  ```javascript
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embeddings",
      queryVector: questionVector,
      numCandidates: 10,
      limit: 3,
      filter: { documentId: { $eq: documentId } }
    }
  }
  ```
- Includes an automatic **in-memory cosine similarity fallback** for local offline testing while the Atlas index builds.

### 4. Zero-Hallucination Guardrails

- The retrieved top-3 matching chunks are formatted into a unified context window and injected into the LLM system prompt:
  > _"Answer the user's question using ONLY the provided text context block. If the answer cannot be found or deduced from the context block, respond exactly with: 'I am sorry, but the answer to that question is not available in the uploaded document.' Do not make up information or hallucinate outside the text boundaries."_

### 5. Persistent MongoDB Sync (No LocalStorage Dependency)

- Document list and metadata are fetched directly from MongoDB on page load.
- Deleting a document from the sidebar invokes `DELETE /api/v1/documents/:documentId`, removing both the metadata record and all associated vector chunks from the database.
- Features request deduplication guards to prevent double-fetching on React StrictMode mounts.

---

## 🛠️ MongoDB Atlas Vector Search Setup Guide

1. Log into your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
2. Under your cluster, navigate to **Atlas Search** (or **Search & Vector Search**).
3. Click **Create Search Index**.
4. Select **Atlas Vector Search** (do **not** choose Atlas Search) ➔ Select **JSON Editor**.
5. Choose your database (e.g. `docqueryai`) and collection: **`document_chunks`**.
6. Set Index Name to: **`vector_index`**.
7. Paste the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embeddings",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

8. Click **Next** ➔ **Create Vector Search Index**. Status will transition from _Building_ to _Active_ within ~60 seconds.

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **MongoDB Atlas** cluster connection string
- **Google Gemini API Key** ([Get free key](https://aistudio.google.com/))

---

### 2. Backend Setup

```bash
cd docuquery-ai-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `docuquery-ai-backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/docqueryai?retryWrites=true&w=majority
VECTOR_INDEX_NAME=vector_index
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Start the backend service:

```bash
npm run dev
```

- **API Live at:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/health`

---

### 3. Frontend Setup

Open a new terminal window:

```bash
cd docuquery-ai-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Ensure `docuquery-ai-frontend/.env` points to the backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Start the frontend dashboard:

```bash
npm run dev
```

- **Dashboard Live at:** `http://localhost:3000`

---

## 🧪 Testing with Sample Documents

Ready-to-use sample documents are located in [`docuquery-ai-backend/sample_documents/`](./docuquery-ai-backend/sample_documents/):

| Document                                | Format | Domain         | Sample Question                                                                    |
| :-------------------------------------- | :----: | :------------- | :--------------------------------------------------------------------------------- |
| `employee_handbook_remote_policy.md`    | `.md`  | HR Policies    | _"What is the home office setup allowance and monthly internet subsidy?"_          |
| `cloud_architecture_security_specs.txt` | `.txt` | Cloud Security | _"What is the token expiration window and key rotation interval?"_                 |
| `product_catalog_sales_data.csv`        | `.csv` | Tabular Data   | _"Which supplier produces the 4K Gaming Monitor and what is its warranty?"_        |
| `medical_clinical_trial_summary.txt`    | `.txt` | Healthcare     | _"What was the reduction in MADRS score for the 50mg cohort compared to placebo?"_ |
| `acme_corp_q3_financial_report.md`      | `.md`  | Financials     | _"What was the total revenue in Q3 and what drove the growth?"_                    |

### Testing Anti-Hallucination Guardrail:

Ask any question unrelated to the uploaded file (e.g., _"Who won the 2022 World Cup?"_).  
The system will strictly return:

> _"I am sorry, but the answer to that question is not available in the uploaded document."_

---

## 📡 REST API Reference

| Method   | Endpoint                        | Description                                        | Payload / Params                           |
| :------- | :------------------------------ | :------------------------------------------------- | :----------------------------------------- |
| `GET`    | `/health`                       | Service uptime and memory diagnostics              | None                                       |
| `GET`    | `/api/v1/documents`             | Fetch all indexed documents from MongoDB           | None                                       |
| `POST`   | `/api/v1/documents/upload`      | Upload & chunk document, generate embeddings       | `multipart/form-data` (`file`)             |
| `POST`   | `/api/v1/documents/query`       | Semantic vector query strictly grounded in context | `{"documentId": "...", "question": "..."}` |
| `DELETE` | `/api/v1/documents/:documentId` | Delete document metadata and all vector chunks     | URL Param: `documentId`                    |

---

## 🛡️ Recruiter & Production Highlights

- **Zero TypeScript Errors:** Built with strict compilation (`strict: true`, `noImplicitAny: true`).
- **Memory Buffer Security:** File uploads are held strictly in temporary in-memory buffers (capped at 10MB) and never written to plain disk.
- **Fail-Safe Architecture:** Dual-mode retrieval (MongoDB Atlas `$vectorSearch` with automatic in-memory cosine fallback).
- **Graceful Shutdown:** Native `SIGINT` / `SIGTERM` listeners ensuring clean socket termination and MongoDB connection pool draining.
- **Client-Side Deduplication:** Guards against duplicate React 18 / Next.js StrictMode requests.

---

## 🚀 Live Production Deployment Guide

Deploying DocQuery AI takes under 5 minutes using **Render** (for the Express microservice) and **Vercel** (for the Next.js frontend).

### 1. Backend Deployment on [Render](https://render.com)

1. Sign in to **Render** and click **New +** → **Web Service**.
2. Connect your GitHub repository: `SangishettyPrem/DocQuery-AI`.
3. Configure service settings:
   - **Name:** `docuquery-ai-backend`
   - **Root Directory:** `docuquery-ai-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add the following **Environment Variables** in the Render Dashboard:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | `mongodb+srv://<username>:<password>@docqueryai.kxg4y9t.mongodb.net/docuquery_ai?retryWrites=true&w=majority` |
   | `VECTOR_INDEX_NAME` | `vector_index` |
   | `AI_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | _Your Google Gemini API Key_ |
5. Click **Create Web Service**. Once deployed, copy your backend URL (e.g., `https://docuquery-ai-backend.onrender.com`).

> **Tip for MongoDB Atlas:** Ensure your MongoDB Atlas Network Access allows connections from anywhere (`0.0.0.0/0`) so Render's dynamic outbound IP addresses can connect.

---

### 2. Frontend Deployment on [Vercel](https://vercel.com)

1. Sign in to **Vercel** and click **Add New...** → **Project**.
2. Import your GitHub repository: `SangishettyPrem/DocQuery-AI`.
3. Configure project settings:
   - **Root Directory:** Click **Edit** and select `docuquery-ai-frontend`.
   - **Framework Preset:** `Next.js` (automatically detected).
4. In **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://<your-backend-app-name>.onrender.com` |
5. Click **Deploy**. Within 60 seconds, your interactive Next.js RAG dashboard will be live on a global CDN!

---

This project is open-source and licensed under the [MIT License](LICENSE).
