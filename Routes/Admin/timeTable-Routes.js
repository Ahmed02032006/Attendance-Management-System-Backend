import express from 'express';
import {
  createTimetable,
  getAllTimetablesBySchool,
  getTimetableById,
  updateTimetable,
  deleteTimetable
} from '../../Controllers/Admin/timeTableController.js';

const router = express.Router();

router.post('/create', createTimetable);
router.get('/get/:schoolId', getAllTimetablesBySchool);
router.get('/single/:id', getTimetableById);
router.put('/update/:id', updateTimetable);
router.delete('/delete/:id', deleteTimetable);

export default router;
