import Attendance from '../../Models/attendanceModel.js';
import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

export const createAttendance = async (req, res) => {
  try {
    const {
      studentName,
      rollNo,
      time,
      subjectId,
      date,
      ipAddress
    } = req.body;

    // Validate required fields
    if (!studentName || !rollNo || !time || !subjectId || !ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: studentName, rollNo, time, subjectId, ipAddress'
      });
    }

    // Validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Handle date - if not provided, use current date
    let attendanceDate;
    if (date) {
      attendanceDate = new Date(date);
      if (isNaN(attendanceDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }
    } else {
      attendanceDate = new Date();
    }

    // ✅ CONDITION 1: Only allow attendance if date is today
    const today = new Date();
    const isSameDate =
      attendanceDate.getFullYear() === today.getFullYear() &&
      attendanceDate.getMonth() === today.getMonth() &&
      attendanceDate.getDate() === today.getDate();

    if (!isSameDate) {
      return res.status(400).json({
        success: false,
        message: 'QR expired — attendance can only be marked for today'
      });
    }

    // Normalize date to start of day for comparison
    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ CONDITION 2: Check if attendance record already exists for same student, subject, and date
    const existingAttendance = await Attendance.findOne({
      rollNo,
      subjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student on this date'
      });
    }

    // ✅ NEW CONDITION 3: Check if same IP address has been used for any attendance on the same day
    const existingIPAttendance = await Attendance.findOne({
      ipAddress,
      subjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingIPAttendance) {
      return res.status(400).json({
        success: false,
        message: 'This device has already been used for attendance today'
      });
    }

    // Create new attendance record with IP address
    const attendance = new Attendance({
      studentName,
      rollNo,
      time,
      subjectId,
      date: attendanceDate,
      ipAddress // Make sure to save IP address in the model
    });

    const savedAttendance = await attendance.save();

    // Populate subject details in response
    await savedAttendance.populate('subjectId', 'subjectTitle subjectName subjectCode');

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: savedAttendance
    });
  } catch (error) {
    console.error('Error creating attendance:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate attendance record found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating attendance record',
      error: error.message
    });
  }
};

export const getSubjectsByUserWithAttendance = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get all subjects for this user
    const subjects = await Subject.find({ userId })
      .sort({ createdAt: -1 });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subjects found for this user'
      });
    }

    // Get attendance data for all subjects and format like dummy object
    const subjectsWithAttendance = await Promise.all(
      subjects.map(async (subject) => {
        // Get all attendance records for this subject
        const attendanceRecords = await Attendance.find({ subjectId: subject._id })
          .sort({ date: -1, time: 1 });

        // Group attendance by date (format: YYYY-MM-DD)
        const attendanceByDate = {};
        
        attendanceRecords.forEach(record => {
          const dateKey = record.date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          
          if (!attendanceByDate[dateKey]) {
            attendanceByDate[dateKey] = [];
          }
          
          attendanceByDate[dateKey].push({
            id: record._id,
            studentName: record.studentName,
            rollNo: record.rollNo,
            time: record.time,
            subject: subject.subjectName
          });
        });

        return {
          id: subject._id.toString(),
          name: subject.subjectName,
          attendance: attendanceByDate
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Subjects with attendance data fetched successfully',
      data: subjectsWithAttendance,
    });
  } catch (error) {
    console.error('Error fetching subjects with attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects with attendance data',
      error: error.message
    });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      rollNo,
      time,
      date
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID'
      });
    }

    // Check if attendance exists
    const existingAttendance = await Attendance.findById(id);
    if (!existingAttendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Check for duplicate attendance if rollNo or date is being changed
    if (rollNo || date) {
      const duplicateAttendance = await Attendance.findOne({
        rollNo: rollNo || existingAttendance.rollNo,
        date: new Date(date || existingAttendance.date),
        subjectId: existingAttendance.subjectId,
        _id: { $ne: id }
      });

      if (duplicateAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already exists for this student on this date'
        });
      }
    }

    // Update attendance record
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      {
        studentName,
        rollNo,
        time,
        date: date ? new Date(date) : existingAttendance.date
      },
      { new: true, runValidators: true }
    ).populate('subjectId', 'subjectTitle subjectName subjectCode');

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: updatedAttendance
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance record',
      error: error.message
    });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID'
      });
    }

    const attendance = await Attendance.findByIdAndDelete(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance record',
      error: error.message
    });
  }
};





// | =========== | Version 2 | =========== |

// export const createAttendance = async (req, res) => {
//   try {
//     const {
//       studentName,
//       rollNo,
//       time,
//       subjectId,
//       date,
//       ipAddress
//     } = req.body;

//     // Validate required fields
//     if (!studentName || !rollNo || !time || !subjectId || !ipAddress) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide all required fields: studentName, rollNo, time, subjectId'
//       });
//     }

//     // Validate subjectId
//     if (!mongoose.Types.ObjectId.isValid(subjectId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid subject ID'
//       });
//     }

//     // Check if subject exists
//     const subject = await Subject.findById(subjectId);
//     if (!subject) {
//       return res.status(404).json({
//         success: false,
//         message: 'Subject not found'
//       });
//     }

//     // Handle date - if not provided, use current date
//     let attendanceDate;
//     if (date) {
//       attendanceDate = new Date(date);
//       if (isNaN(attendanceDate.getTime())) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid date format. Use YYYY-MM-DD format'
//         });
//       }
//     } else {
//       attendanceDate = new Date();
//     }

//     // ✅ NEW CONDITION: Only allow attendance if date is today
//     const today = new Date();
//     const isSameDate =
//       attendanceDate.getFullYear() === today.getFullYear() &&
//       attendanceDate.getMonth() === today.getMonth() &&
//       attendanceDate.getDate() === today.getDate();

//     if (!isSameDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'QR expired — attendance can only be marked for today'
//       });
//     }

//     // Normalize date to start of day for comparison
//     const startOfDay = new Date(attendanceDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(attendanceDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     // Check if attendance record already exists for same student, subject, and date
//     const existingAttendance = await Attendance.findOne({
//       rollNo,
//       subjectId,
//       date: {
//         $gte: startOfDay,
//         $lte: endOfDay
//       }
//     });

//     if (existingAttendance) {
//       return res.status(400).json({
//         success: false,
//         message: 'Attendance already marked for this student on this date'
//       });
//     }

//     // Create new attendance record
//     const attendance = new Attendance({
//       studentName,
//       rollNo,
//       time,
//       subjectId,
//       date: attendanceDate
//     });

//     const savedAttendance = await attendance.save();

//     // Populate subject details in response
//     await savedAttendance.populate('subjectId', 'subjectTitle subjectName subjectCode');

//     res.status(201).json({
//       success: true,
//       message: 'Attendance recorded successfully',
//       data: savedAttendance
//     });
//   } catch (error) {
//     console.error('Error creating attendance:', error);

//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: errors
//       });
//     }

//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Duplicate attendance record found'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Error creating attendance record',
//       error: error.message
//     });
//   }
// };

// | =========== | Version 1 | =========== | 

// export const createAttendance = async (req, res) => {
//   try {
//     const {
//       studentName,
//       rollNo,
//       time,
//       subjectId,
//       date
//     } = req.body;

//     // Validate required fields
//     if (!studentName || !rollNo || !time || !subjectId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide all required fields: studentName, rollNo, time, subjectId'
//       });
//     }

//     // Validate subjectId
//     if (!mongoose.Types.ObjectId.isValid(subjectId)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid subject ID'
//       });
//     }

//     // Check if subject exists
//     const subject = await Subject.findById(subjectId);
//     if (!subject) {
//       return res.status(404).json({
//         success: false,
//         message: 'Subject not found'
//       });
//     }

//     // Handle date - if not provided, use current date
//     let attendanceDate;
//     if (date) {
//       attendanceDate = new Date(date);
//       if (isNaN(attendanceDate.getTime())) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid date format. Use YYYY-MM-DD format'
//         });
//       }
//     } else {
//       attendanceDate = new Date();
//     }

//     // Normalize date to start of day for comparison (to compare only dates, not times)
//     const startOfDay = new Date(attendanceDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(attendanceDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     // Check if attendance record already exists for same student, subject, and date
//     const existingAttendance = await Attendance.findOne({
//       rollNo,
//       subjectId,
//       date: {
//         $gte: startOfDay,
//         $lte: endOfDay
//       }
//     });

//     if (existingAttendance) {
//       return res.status(400).json({
//         success: false,
//         message: 'Attendance already marked for this student on this date and subject'
//       });
//     }

//     // Create new attendance record
//     const attendance = new Attendance({
//       studentName,
//       rollNo,
//       time,
//       subjectId,
//       date: attendanceDate
//     });

//     const savedAttendance = await attendance.save();

//     // Populate subject details in response
//     await savedAttendance.populate('subjectId', 'subjectTitle subjectName subjectCode');

//     res.status(201).json({
//       success: true,
//       message: 'Attendance recorded successfully',
//       data: savedAttendance
//     });
//   } catch (error) {
//     console.error('Error creating attendance:', error);
    
//     // Handle specific MongoDB errors
//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => err.message);
//       return res.status(400).json({
//         success: false,
//         message: 'Validation error',
//         errors: errors
//       });
//     }
    
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Duplicate attendance record found'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Error creating attendance record',
//       error: error.message
//     });
//   }
// };
