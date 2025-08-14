import express from "express";
import {
  createLeaveRequest,
  createTeacher,
  getTeacherBySchoolId,
  markAttendance,
  updateLeaveRequestStatus,
  getTeacherCountBySchoolId,
  updateTeacher,
  changeTeacherStatus
} from "../../Controllers/Admin/teacherController.js";

const Router = express.Router();

Router.route("/create").post(createTeacher);
Router.route("/get/:schoolId").get(getTeacherBySchoolId);
Router.route("/count/:schoolId").get(getTeacherCountBySchoolId);

// Attendance Routes
Router.route("/attendance/mark").post(markAttendance);

// Leave Request Routes
Router.route("/leave/create").post(createLeaveRequest);
Router.route("/leave/update/:teacherId/:requestId").put(updateLeaveRequestStatus);

// Update Teacher Details
Router.route("/update/:id").put(updateTeacher);

// Change Teacher Status
Router.route("/status/change/:id").put(changeTeacherStatus);

export default Router;
