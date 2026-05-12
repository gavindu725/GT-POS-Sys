import express from "express";
import {
  getAllPromotionPaths,
  getPromotionPathById,
  createPromotionPath,
  updatePromotionPath,
  deletePromotionPath,
  assignPromotionPathToEmployee,
  getEmployeePromotionStatus,
  promoteEmployeeInPath,
} from "../controllers/promotion.Controller.js";

const router = express.Router();

/**
 * Promotion Path Configuration Routes
 */

// Get all promotion paths
router.get("/paths", getAllPromotionPaths);

// Get promotion path by ID
router.get("/paths/:id", getPromotionPathById);

// Create new promotion path
router.post("/paths", createPromotionPath);

// Update promotion path
router.put("/paths/:id", updatePromotionPath);

// Delete promotion path
router.delete("/paths/:id", deletePromotionPath);

/**
 * Employee Promotion Management Routes
 */

// Assign promotion path to employee
router.post("/assign", assignPromotionPathToEmployee);

// Get employee's promotion status
router.get("/employee/:employeeId/status", getEmployeePromotionStatus);

// Promote employee to next step
router.post("/employee/:employeeId/promote", promoteEmployeeInPath);

export default router;
