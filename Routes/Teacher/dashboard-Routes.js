import express from 'express';
import {
  getSubjectsByUser,
  getAttendanceData,
} from '../../Controllers/Teacher/dashboardController.js';

const Router = express.Router();

Router.route("/subjects/:userId").get(getSubjectsByUser);
Router.route("/attendance/:userId").get(getAttendanceData);

export default Router;