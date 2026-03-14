import express from 'express';
import {
  createAuditLog,
  getTeacherAuditLogs,
  deleteAllTeacherAuditLogs
} from '../../Controllers/Admin/auditLogController.js';

const router = express.Router();

router.post('/logs', createAuditLog);
router.get('/logs/teacher/:teacherId', getTeacherAuditLogs);
router.delete('/logs/teacher/:teacherId', deleteAllTeacherAuditLogs);

export default router;