import express from "express";
import {
  getEmployeeList,
  getEmployeeDocuments,
  downloadDocumentsAsZip,
  downloadCombinedPdf,
} from "../controllers/reports.Controller.js";
import { verifyAdmin } from "../middleware/auth.js";

const reportsRouter = express.Router();

reportsRouter.get("/employees", verifyAdmin, getEmployeeList);
reportsRouter.get(
  "/employee-documents/:employeeId",
  verifyAdmin,
  getEmployeeDocuments
);
reportsRouter.get(
  "/download-zip/:employeeId",
  verifyAdmin,
  downloadDocumentsAsZip
);
reportsRouter.get(
  "/download-combined-pdf/:employeeId",
  verifyAdmin,
  downloadCombinedPdf
);

export default reportsRouter;
