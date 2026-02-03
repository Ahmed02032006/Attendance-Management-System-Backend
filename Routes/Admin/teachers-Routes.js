import express from 'express';
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
} from '../../Controllers/Admin/teachersController.js';

const router = express.Router();

router.post('/users', createUser); // Create new user
router.get('/users', getAllUsers); // Get all users with filtering & pagination
router.put('/users/:id', updateUser); // Update user
router.delete('/users/:id', deleteUser); // Delete user

export default router;