import express from 'express';
import {
  moveToTrash,
  recoverFromTrash,
  getTrashItem,
  getTrashItemDetails,
  permanentDeleteFromTrash
} from '../../Controllers/Admin/trashController.js';

const Router = express.Router();

Router.post('/move/:subjectId', moveToTrash);
Router.get('/', getTrashItem);
Router.get('/:trashId', getTrashItemDetails);
Router.post('/recover/:trashId', recoverFromTrash);
Router.delete('/:trashId', permanentDeleteFromTrash);

export default Router;