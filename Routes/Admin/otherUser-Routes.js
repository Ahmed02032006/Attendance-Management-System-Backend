import express from "express";
import {
  createOtherUser,
  getAllOtherUsers,
  getOtherUserById,
  updateOtherUser,
  deleteOtherUser,
  updateOtherUserStatus,
} from "../../Controllers/Admin/otherUserController.js";

const router = express.Router();

router.post("/create", createOtherUser);
router.get("/get/school/:schoolId", getAllOtherUsers);
router.get("/:id", getOtherUserById);
router.put("/update/:id", updateOtherUser);
router.delete("/delete/:id", deleteOtherUser);
router.put("/update-status/:id", updateOtherUserStatus);

export default router;