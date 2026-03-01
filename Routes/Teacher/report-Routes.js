import express from 'express';
import {
  getSubjectAttendanceReport,
  exportAttendanceReport
} from '../../Controllers/Teacher/reportController.js';

const Router = express.Router();

Router.get('/report/:subjectId', getSubjectAttendanceReport);
Router.get('/report/:subjectId/export', exportAttendanceReport);

export default Router;