import express from 'express';
import {
  createSubject,
  getSubjectsByUser,
  updateSubject,
  deleteSubject,
  resetSubject
} from '../../Controllers/Teacher/subjectController.js';

const Router = express.Router();

Router.route("/user/:userId").get(getSubjectsByUser);
Router.route("/").post(createSubject);
Router.route("/:id").put(updateSubject);
Router.route("/:id").delete(deleteSubject);
Router.route("/:id/reset-attendance").delete(resetSubject);

export default Router;
