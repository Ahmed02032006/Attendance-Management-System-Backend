import express from 'express';
import {
  createSubject,
  getSubjectsByUser,
  updateSubject,
  deleteSubject,
  resetSubject,
  addRegisteredStudents,
  deleteRegisteredStudent,
  getRegisteredStudentsBySubject,
  updateRegisteredStudent,
  deleteAllRegisteredStudents  // Make sure this is imported
} from '../../Controllers/Teacher/subjectController.js';

const Router = express.Router();

Router.route("/user/:userId").get(getSubjectsByUser);
Router.route("/").post(createSubject);
Router.route("/:id").put(updateSubject);
Router.route("/:id").delete(deleteSubject);
Router.route("/reset-attendance/:id").delete(resetSubject);

Router.route("/:subjectId/registered-students").get(getRegisteredStudentsBySubject);
Router.route("/:subjectId/registered-students").post(addRegisteredStudents);
Router.route("/:subjectId/registered-students").delete(deleteAllRegisteredStudents); // This line
Router.route("/:subjectId/registered-students/:studentId").put(updateRegisteredStudent);
Router.route("/:subjectId/registered-students/:studentId").delete(deleteRegisteredStudent);

export default Router;