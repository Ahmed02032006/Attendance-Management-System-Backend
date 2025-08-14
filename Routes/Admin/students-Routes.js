import express from "express";
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsBySchoolId,
} from "../../Controllers/Admin/studentsController.js";

const router = express.Router();

router.post("/create", createStudent);
router.get("/get/all", getAllStudents);
router.get("/get/school/:schoolId", getStudentsBySchoolId);
router.get("/:id", getStudentById);
router.put("/update/:id", updateStudent);
router.delete("/delete/:id", deleteStudent);

export default router;
