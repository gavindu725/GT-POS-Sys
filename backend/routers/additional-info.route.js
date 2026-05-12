import express from "express";
import {
  getAdditionalInfo,
  addAdditionalInfo,
  updateAdditionalInfo,
  deleteAdditionalInfo,
  deleteDocument,
} from "../controllers/additional-info.Controller.js";
import { verifyAdmin } from "../middleware/auth.js";

const additionalInfoRouter = express.Router();

// Log all requests to this router
additionalInfoRouter.use((req, res, next) => {
  console.log(
    `\n🔵 Additional Info Route Hit: ${req.method} ${req.originalUrl}`
  );
  console.log("Body:", req.body);
  next();
});

additionalInfoRouter.get("/additional-info", verifyAdmin, getAdditionalInfo);
additionalInfoRouter.post("/additional-info", verifyAdmin, addAdditionalInfo);
additionalInfoRouter.put(
  "/additional-info/:employeeId",
  verifyAdmin,
  updateAdditionalInfo
);
additionalInfoRouter.delete(
  "/additional-info/:employeeId",
  verifyAdmin,
  deleteAdditionalInfo
);
additionalInfoRouter.delete(
  "/additional-info/document/:documentId",
  verifyAdmin,
  deleteDocument
);

export default additionalInfoRouter;
