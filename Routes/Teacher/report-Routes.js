import express from 'express';
import {
  getSubjectAttendanceReport,
  exportAttendanceReport
} from '../../Controllers/Teacher/reportController.js';

const Router = express.Router();

Router.get('/:subjectId', getSubjectAttendanceReport);
Router.get('/:subjectId/export', exportAttendanceReport);

export default Router;