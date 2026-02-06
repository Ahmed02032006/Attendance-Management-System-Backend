import express from 'express';
import {
  updateUser
} from '../../Controllers/Teacher/userController.js';

const router = express.Router();

router.put('/:id', updateUser); // Update user

export default router;