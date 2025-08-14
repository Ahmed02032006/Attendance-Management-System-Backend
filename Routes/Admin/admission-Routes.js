import express from "express";
import {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  updateApplicationStatus,
} from "../../Controllers/Admin/admissionController.js";

const router = express.Router();

router.post("/create", createApplication);
router.get("/get/school/:schoolId", getAllApplications);
router.get("/:id", getApplicationById);
router.put("/update/:id", updateApplication);
router.delete("/delete/:id", deleteApplication);
router.put("/update-status/:id", updateApplicationStatus);

export default router;
