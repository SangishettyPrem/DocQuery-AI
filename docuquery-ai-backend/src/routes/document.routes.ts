import { Router } from "express";
import multer from "multer";
import {
  uploadDocument,
  queryDocument,
  getAllDocuments,
  deleteDocument,
} from "../controllers/document.controller";
import { asyncHandler } from "../middlewares/async.middleware";

const router = Router();

// Configure Multer with secure in-memory storage buffer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum file size
    files: 1,
  },
});

router.get("/", asyncHandler(getAllDocuments));
router.post("/upload", upload.single("file"), asyncHandler(uploadDocument));
router.post("/query", asyncHandler(queryDocument));
router.delete("/:documentId", asyncHandler(deleteDocument));

export default router;
