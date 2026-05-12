import express from "express";
import * as controller from "../controllers/transfer.Controller.js";

const router = express.Router();

// Debug middleware for transfer routes
router.use((req, res, next) => {
  console.log(`📦 Transfer Route: ${req.method} ${req.originalUrl}`);
  next();
});

// Non-parameterized routes first
router.post("/requests", controller.submitTransferRequest);
router.get("/requests", controller.getTransferRequests);
router.get("/statistics", controller.getTransferStatistics);

// Routes with :id/action pattern (more specific)
router.put("/requests/:id/approve", controller.approveTransfer);
router.put("/requests/:id/complete", controller.completeTransfer);
router.put("/requests/:id/cancel", controller.cancelTransfer);
router.post("/requests/:id/backup", controller.backupEmployeeData);
router.delete("/requests/:id/data", controller.deleteEmployeeData);

// Most generic parameterized route last
router.get("/requests/:id", controller.getTransferById);

export default router;
