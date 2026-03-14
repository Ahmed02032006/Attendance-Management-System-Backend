import AuditLog from '../../Models/auditLogModel.js';
import mongoose from 'mongoose';

// Create a new audit log
export const createAuditLog = async (req, res) => {
  try {
    const { userId, heading, status } = req.body;

    // Validate required fields
    if (!userId || !heading) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId and heading are required'
      });
    }

    // Create new audit log
    const auditLog = new AuditLog({
      userId,
      heading,
      status: status || 'success',
      timestamp: new Date()
    });

    const savedLog = await auditLog.save();

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      data: savedLog
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating audit log',
      error: error.message
    });
  }
};

// Get audit logs for a specific teacher
export const getTeacherAuditLogs = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get logs for specific teacher
    const logs = await AuditLog.find({ userId: teacherId })
      .populate('userId', 'userName userEmail userRole')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await AuditLog.countDocuments({ userId: teacherId });

    res.status(200).json({
      success: true,
      message: 'Audit logs fetched successfully',
      data: {
        logs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};
