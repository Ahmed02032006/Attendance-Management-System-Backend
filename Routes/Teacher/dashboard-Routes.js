import express from 'express';
import {
  getSubjectsByUser,
  getAttendanceData,
  getTeacherStats
} from '../../Controllers/Teacher/dashboardController.js';

const Router = express.Router();

Router.route("/subjects/:userId").get(getSubjectsByUser);
Router.route("/attendance/:userId").get(getAttendanceData);
Router.route("/stats/:userId").get(getTeacherStats);

export default Router;