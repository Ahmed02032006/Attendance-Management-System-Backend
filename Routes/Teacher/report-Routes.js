import express from 'express';
import {
  getSubjectAttendanceReport,
  exportAttendanceReport,
  getStudentAttendanceDetails,
  getStudentSummary
} from '../../Controllers/Teacher/reportController.js';

const Router = express.Router();

Router.get('/:subjectId', getSubjectAttendanceReport);
Router.get('/:subjectId/export', exportAttendanceReport);
Router.get('/studentAttendanceDetail/:rollNo/:subjectId', getStudentAttendanceDetails);

export default Router;