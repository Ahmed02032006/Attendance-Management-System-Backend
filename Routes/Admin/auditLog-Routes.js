import express from 'express';
import {
  createAuditLog,
  getTeacherAuditLogs
} from '../../Controllers/Admin/auditLogController.js';

const router = express.Router();

router.post('/logs', createAuditLog);
router.get('/logs/teacher/:teacherId', getTeacherAuditLogs);

export default router;