import express from "express";
import { addTeacherToClass, createClass, deleteClass, getClassById, getClassesBySchool, removeTeacherFromClass, updateClass, updateClassStatus, updateStudentCount } from "../../Controllers/Admin/classController.js";

const router = express.Router();

// Class CRUD operations
router.post("/create", createClass);
router.get("/get/school/:schoolId", getClassesBySchool);
router.get("/get/:classId", getClassById);
router.put("/update/:classId", updateClass);
router.delete("/delete/:classId", deleteClass);

// Class specific operations
router.put("/updateStudents/:classId", updateStudentCount);
router.post("/addTeacher/:classId", addTeacherToClass);
router.delete("/removeTeacher/:classId/:teacherEmail", removeTeacherFromClass);
router.put("/updateStatus/:classId", updateClassStatus);

export default router;