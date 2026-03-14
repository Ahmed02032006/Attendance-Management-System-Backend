import express from 'express';
import {
  getTeacherAuditLogs,
  getAllAuditLogs,
  getTeacherAuditSummary
} from '../../Controllers/Admin/auditLogController.js';

const router = express.Router();

router.get('/logs', getAllAuditLogs);
router.get('/logs/teacher/:teacherId', getTeacherAuditLogs);
router.get('/logs/teacher/:teacherId/summary', getTeacherAuditSummary);

export default router;