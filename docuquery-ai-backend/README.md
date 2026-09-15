# DocuQuery AI — Enterprise RAG & Vector Search Microservice

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-forestgreen.svg)](https://www.mongodb.com/products/platform/atlas-vector-search)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini_&_OpenAI-orange.svg)](https://ai.google.dev/)

A complete, production-grade microservice for **Context-Restricted Document Question Answering** built from scratch. It pairs **Google Gemini** (or **OpenAI**) embeddings with **MongoDB Atlas Vector Search** (`$vectorSearch`), featuring strict anti-hallucination guardrails and clean RESTful API endpoints.

---

## 🌟 Key Architectural Features

1. **Intelligent Overlapping Text Chunker:**
   - Slices incoming documents (`.txt`, `.md`, `.csv`) into windows of **~500 characters** with a **100-character overlap**.
   - Preserves sentence and paragraph boundaries to maintain semantic context across chunks.

2. **Dual AI Provider Vector Pipelines:**
   - **Google Gemini:** `text-embedding-004` (768 dimensions) paired with `gemini-1.5-flash`.
   - **OpenAI:** `text-embedding-3-small` (1536 dimensions) paired with `gpt-4o-mini`.
   - Toggle seamlessly via single environment variable: `AI_PROVIDER=gemini` or `AI_PROVIDER=openai`.

3. **Native MongoDB Atlas `$vectorSearch`:**
   - Employs Atlas Vector Search aggregation pipelines utilizing **Cosine Similarity**.
   - Applies pre-filtering by `documentId` for scoped document retrieval.
   - Includes automatic, in-memory cosine fallback for seamless offline testing and local dev.

4. **Zero-Hallucination Guardrails:**
   - LLM completion is strictly bound by system prompt instruction:
     > *"Answer the user's question using ONLY the provided text context block. If the answer cannot be found or deduced from the context block, respond exactly with: 'I am sorry, but the answer to that question is not available in the uploaded document.' Do not make up information or hallucinate outside the text boundaries."*

---

## 📂 Project Structure

```
DocQuery AI/
├── src/
│   ├── config/
│   │   ├── db.config.ts           # Mongoose connection & lifecycle events
│   │   └── env.config.ts          # Zod schema environment validation
│   ├── controllers/
│   │   └── document.controller.ts # Ingestion, chunking, and query handlers
│   ├── middlewares/
│   │   ├── async.middleware.ts    # Unhandled rejection wrapper
│   │   └── error.middleware.ts    # Centralized error handler & status codes
│   ├── models/
│   │   └── chunk.model.ts         # Mongoose schema for document_chunks
│   ├── routes/
│   │   └── document.routes.ts     # Express router with Multer memory buffer
│   ├── services/
│   │   ├── ai.service.ts          # Chunking, embedding, & LLM prompt generation
│   │   └── vector.service.ts      # Atlas $vectorSearch queries & context assembly
│   ├── app.ts                     # Express application configurations
│   └── server.ts                  # Application bootstrap entry point
├── sample_documents/
│   └── acme_corp_q3_financial_report.md # Demo document for testing
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🛠️ Step-by-Step MongoDB Atlas Vector Search Setup

To enable native `$vectorSearch` in your MongoDB Atlas cluster:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to your **Database** -> Click on your Cluster -> Select the **Atlas Search** tab (or **Search & Vector Search**).
3. Click **Create Search Index** -> Select **Atlas Vector Search** -> Choose the **JSON Editor**.
4. Select your database (e.g. `docuquery_ai`) and target collection: **`document_chunks`**.
5. Set the **Index Name** to: `vector_index` (matching `VECTOR_INDEX_NAME` in `.env`).
6. Paste the configuration matching your chosen `AI_PROVIDER`:

### Configuration for Google Gemini (`text-embedding-004` — 768 dimensions):
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

### Configuration for OpenAI (`text-embedding-3-small` — 1536 dimensions):
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embeddings",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

7. Click **Next** -> **Create Vector Search Index**. The status will show *Building* and change to *Active* within a minute.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- MongoDB Atlas connection string (or local MongoDB for fallback testing)
- Google Gemini API Key ([Get free API key](https://aistudio.google.com/)) OR OpenAI API Key

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/docuquery_ai?retryWrites=true&w=majority
VECTOR_INDEX_NAME=vector_index
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```

The application will start at:
- **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Testing the API via cURL

### 1. Ingest a Document (`POST /api/v1/documents/upload`)
Upload any text, markdown, or CSV file.

**Using cURL:**
```bash
curl -X POST http://localhost:5000/api/v1/documents/upload \
  -F "file=@sample_documents/acme_corp_q3_financial_report.md"
```

**Response:**
```json
{
  "success": true,
  "message": "Document successfully uploaded, chunked, embedded, and indexed.",
  "data": {
    "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
    "fileName": "acme_corp_q3_financial_report.md",
    "totalChunks": 4,
    "embeddingDimensions": 768,
    "createdAt": "2026-09-14T10:35:00.000Z"
  }
}
```

### 2. Query the Document (`POST /api/v1/documents/query`)
Ask questions strictly grounded in the document context.

**Using cURL (In-domain question):**
```bash
curl -X POST http://localhost:5000/api/v1/documents/query \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
    "question": "What was the total revenue for Q3 and what drove the growth?"
  }'
```

**Response:**
```json
{
  "success": true,
  "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
  "question": "What was the total revenue for Q3 and what drove the growth?",
  "answer": "According to the provided report, total revenue for Q3 was $14.8 million (a 24% year-over-year increase), driven by strong enterprise subscription adoption in the cloud analytics division.",
  "sources": [
    {
      "rank": 1,
      "chunkIndex": 0,
      "similarityScore": 0.8912,
      "preview": "ACME Corporation Q3 Financial Report...\nTotal revenue reached $14.8 million..."
    }
  ]
}
```

**Anti-Hallucination Test (Out-of-domain question):**
```bash
curl -X POST http://localhost:5000/api/v1/documents/query \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
    "question": "Who won the 2022 FIFA World Cup?"
  }'
```

**Response:**
```json
{
  "success": true,
  "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
  "question": "Who won the 2022 FIFA World Cup?",
  "answer": "I am sorry, but the answer to that question is not available in the uploaded document.",
  "sources": []
}
```

### 3. List All Indexed Documents (`GET /api/v1/documents`)
```bash
curl -X GET http://localhost:5000/api/v1/documents
```

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "documentId": "7d3c5f24-9b16-43c2-8419-f9c3f30b91d2",
      "fileName": "acme_corp_q3_financial_report.md",
      "fileSize": 1809,
      "chunkCount": 4,
      "uploadedAt": "2026-09-14T10:35:00.000Z"
    }
  ]
}
```

### 4. Delete Document & Vector Chunks (`DELETE /api/v1/documents/:documentId`)
```bash
curl -X DELETE http://localhost:5000/api/v1/documents/7d3c5f24-9b16-43c2-8419-f9c3f30b91d2
```

**Response:**
```json
{
  "success": true,
  "message": "Document \"7d3c5f24-9b16-43c2-8419-f9c3f30b91d2\" and 4 associated chunks deleted from database.",
  "deletedChunks": 4
}
```

---

## 🛡️ Production & Recruiter-Ready Highlights

- **Strict TypeScript Compliance:** Compiles cleanly with zero type errors (`strict: true`, `noImplicitAny: true`).
- **Memory Safety:** Multer uses strictly capped in-memory storage buffers (`10MB`), discarding payload references after processing.
- **Fail-Safe Aggregation:** Dual-mode vector search (Native Atlas `$vectorSearch` with automatic in-memory fallback for local environments).
- **Graceful Shutdown:** Intercepts `SIGINT`/`SIGTERM` to close server sockets and MongoDB connection pools without dropping in-flight requests.
- **Resilient AI Error Handling:** Catches API 429 quota exhaustion and network exceptions with human-friendly diagnostics instead of crashing worker threads.
