import express from "express";
import {
  getAllDocumentTypes,
  getDocumentTypesByCategory,
  getDocumentTypeById,
  addDocumentType,
  updateDocumentType,
  reorderDocumentTypes,
  deleteDocumentType,
} from "../controllers/document-type.Controller.js";

const router = express.Router();

// Get all document types
router.get("/", getAllDocumentTypes);

// Get document types grouped by category
router.get("/categories", getDocumentTypesByCategory);

// Get single document type
router.get("/:id", getDocumentTypeById);

// Add new document type
router.post("/", addDocumentType);

// Update document type
router.put("/:id", updateDocumentType);

// Bulk reorder document types
router.put("/bulk/reorder", reorderDocumentTypes);

// Delete document type
router.delete("/:id", deleteDocumentType);

export default router;
