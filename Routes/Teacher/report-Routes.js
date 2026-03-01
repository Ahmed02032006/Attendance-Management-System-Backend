import express from 'express';
import {
  getCourseAttendanceReport,
  getCoursesSummaryReport,
  exportAttendanceCSV,
  getDashboardStats
} from '../../Controllers/Teacher/reportController.js';

const Router = express.Router();

Router.get('/course-attendance', getCourseAttendanceReport);
Router.get('/courses-summary', getCoursesSummaryReport);
Router.get('/export-csv', exportAttendanceCSV);
Router.get('/dashboard-stats', getDashboardStats);

export default Router;