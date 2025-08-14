import express from "express";
import { createSchool, getSchoolById, getSchoolsByUser, updateTeacherCount } from "../../Controllers/Admin/schoolController.js";

const router = express.Router();

router.get("/:schoolId", getSchoolById);
router.get("/user/:userId", getSchoolsByUser);
router.post("/create", createSchool);
router.put("/updateNoOfTeacher/:schoolId", updateTeacherCount);

export default router;
