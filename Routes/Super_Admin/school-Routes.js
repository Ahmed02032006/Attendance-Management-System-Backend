import express from "express";
import { deleteSchool, getAllSchools, updateSchool, updateSchoolVerificationStatus } from "../../Controllers/Super_Admin/schoolController.js";

const router = express.Router();

router.get("/all", getAllSchools);
router.put("/update/:schoolId", updateSchool);
router.put("/update-verification-status/:schoolId", updateSchoolVerificationStatus);
router.delete("/delete/:schoolId", deleteSchool);

export default router;
