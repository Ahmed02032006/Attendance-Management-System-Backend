import express from 'express';
import {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getSubjectsByUserWithAttendance
} from '../../Controllers/Teacher/attendanceController.js';

const Router = express.Router();

Router.route("/").post(createAttendance);
Router.get('/user/:userId', getSubjectsByUserWithAttendance);
Router.route("/:id").put(updateAttendance);
Router.route("/:id").delete(deleteAttendance);

export default Router;