import express from "express";
import {
  getSalaryPhasesByJobRoleClass,
  calculateSalaryFromYears,
  getYearsInPhase,
} from "../controllers/salary.Controller.js";

const router = express.Router();

// Get salary phases for a job role class
router.get(
  "/phases/job-role-class/:jobRoleClassId",
  getSalaryPhasesByJobRoleClass
);

// Get years available in a specific phase
router.get("/phases/:phaseId/years", getYearsInPhase);

// Calculate current salary based on total years in class
router.post("/calculate-from-years", calculateSalaryFromYears);

export default router;
