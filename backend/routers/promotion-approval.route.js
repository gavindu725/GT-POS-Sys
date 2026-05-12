import express from "express";
import * as controller from "../controllers/promotion-approval.Controller.js";

const router = express.Router();

// Submit promotion application
router.post("/applications", controller.submitPromotionApplication);

// Get all promotion applications (with optional filters)
router.get("/applications", controller.getPromotionApplications);

// Get statistics
router.get("/statistics", controller.getPromotionStatistics);

// Get specific promotion application by ID
router.get("/applications/:id", controller.getPromotionApplicationById);

// Review promotion application (approve/reject)
router.put("/applications/:id/review", controller.reviewPromotionApplication);

// Withdraw promotion application
router.put(
  "/applications/:id/withdraw",
  controller.withdrawPromotionApplication,
);

export default router;
