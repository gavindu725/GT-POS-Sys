import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
} from "../controllers/document-category.Controller.js";

const router = Router();

// Get all categories
router.get("/", getAllCategories);

// Get category by ID
router.get("/:id", getCategoryById);

// Create new category
router.post("/", addCategory);

// Update category
router.put("/:id", updateCategory);

// Bulk reorder categories
router.put("/bulk/reorder", reorderCategories);

// Delete category
router.delete("/:id", deleteCategory);

export default router;
