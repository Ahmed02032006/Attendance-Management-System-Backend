import AuditLog from '../../Models/auditLogModel.js';
import mongoose from 'mongoose';

// Get audit logs for a specific teacher
export const getTeacherAuditLogs = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 20, action, status, startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    // Build filter
    const filter = { userId: teacherId };
    
    if (action) filter.action = action;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get logs
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);

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

// Get audit logs for all teachers (admin view)
export const getAllAuditLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      teacherId, 
      action, 
      status, 
      startDate, 
      endDate 
    } = req.query;

    // Build filter
    const filter = {};
    
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      filter.userId = teacherId;
    }
    if (action) filter.action = action;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get logs with user details populated
    const logs = await AuditLog.find(filter)
      .populate('userId', 'userName userEmail userRole profilePicture')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await AuditLog.countDocuments(filter);

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

// Get audit log summary for a teacher
export const getTeacherAuditSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    const summary = await AuditLog.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          createCount: { $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] } },
          editCount: { $sum: { $cond: [{ $eq: ['$action', 'edit'] }, 1, 0] } },
          deleteCount: { $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] } },
          registerCount: { $sum: { $cond: [{ $eq: ['$action', 'register'] }, 1, 0] } },
          qrCount: { $sum: { $cond: [{ $eq: ['$action', 'create_qr'] }, 1, 0] } },
          exportCount: { 
            $sum: { 
              $cond: [
                { $or: [
                  { $eq: ['$action', 'export_attendance'] },
                  { $eq: ['$action', 'export_report'] }
                ]}, 
                1, 0
              ]
            }
          },
          reportCount: { $sum: { $cond: [{ $eq: ['$action', 'generate_report'] }, 1, 0] } },
          successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          warningCount: { $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] } },
          errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Audit summary fetched successfully',
      data: summary[0] || {
        totalLogs: 0,
        createCount: 0,
        editCount: 0,
        deleteCount: 0,
        registerCount: 0,
        qrCount: 0,
        exportCount: 0,
        reportCount: 0,
        successCount: 0,
        warningCount: 0,
        errorCount: 0
      }
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit summary',
      error: error.message
    });
  }
};