import express from "express";
import { getAllUser } from "../../Controllers/Super_Admin/userController.js";

const router = express.Router();

router.get("/all", getAllUser);

export default router;
