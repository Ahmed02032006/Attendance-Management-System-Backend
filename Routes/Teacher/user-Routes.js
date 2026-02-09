import express from 'express';
import {
  updateUser,
  updateUserLastLoginById
} from '../../Controllers/Teacher/userController.js';

const router = express.Router();

router.put('/:id', updateUser); // Update user
router.put('/updateLastLogin/:userId', updateUserLastLoginById); // Update user

export default router;