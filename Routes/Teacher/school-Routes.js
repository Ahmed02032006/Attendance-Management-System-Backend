import express from "express";
import { getSchoolsByTeacherId } from "../../Controllers/Teacher/schoolController.js";

const router = express.Router();

router.get("/get/:id", getSchoolsByTeacherId);

export default router;
