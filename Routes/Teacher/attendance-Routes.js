import express from 'express';
import {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getSubjectsByUserWithAttendance,
  getRegisteredStudentByRollNo,
  getAttendanceBySchedule // New endpoint
} from '../../Controllers/Teacher/attendanceController.js';

const Router = express.Router();

Router.route("/").post(createAttendance);
Router.get('/user/:userId', getSubjectsByUserWithAttendance);
Router.get('/by-schedule', getAttendanceBySchedule); // New route
Router.route("/:id").put(updateAttendance);
Router.route("/:id").delete(deleteAttendance);
Router.get('/registered-student/:subjectId/:rollNo', getRegisteredStudentByRollNo);

export default Router;