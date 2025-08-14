import express from "express";
import {
  createParent,
  getAllParents,
  getParentsBySchoolId,
  updateParent,
  deleteParent,
  removeStudentFromParent,
} from "../../Controllers/Admin/parentController.js";

const router = express.Router();

// Create new parent
router.post("/create", createParent);
router.get("/all", getAllParents);
router.get("/get/school/:schoolId", getParentsBySchoolId);
router.put("/update/:id", updateParent);
router.delete("/delete/:id", deleteParent);
router.delete("/removeStudent/delete", removeStudentFromParent);

export default router;
