import express from "express";
import {
  getJobRoles,
  getJobRoleClassId,
  addEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
} from "../controllers/employee.Controller.js";
import upload from "../middleware/multer.js";
import { verifyAdmin } from "../middleware/auth.js";

const employeeRouter = express.Router();

employeeRouter.get("/job-roles", verifyAdmin, getJobRoles);
employeeRouter.get("/job-role-class", verifyAdmin, getJobRoleClassId);
employeeRouter.get("/search", verifyAdmin, searchEmployees);
employeeRouter.post(
  "/add-employee",
  verifyAdmin,
  upload.single("profilePhoto"),
  addEmployee,
);
employeeRouter.get("/employees", verifyAdmin, getAllEmployees);
employeeRouter.get("/employee/:id", verifyAdmin, getEmployee);
employeeRouter.put(
  "/employee/:id",
  verifyAdmin,
  upload.single("profilePhoto"),
  updateEmployee,
);
employeeRouter.delete("/employee/:id", verifyAdmin, deleteEmployee);

export default employeeRouter;
