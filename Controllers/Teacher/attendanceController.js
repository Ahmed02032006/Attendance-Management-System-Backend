import Attendance from '../../Models/attendanceModel.js';
import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

// Update getSubjectsByUserWithAttendance to include class schedule info
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

    // Get only ACTIVE subjects for this user
    const subjects = await Subject.find({
      userId,
      status: 'Active'
    }).sort({ createdAt: -1 });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subjects found for this user'
      });
    }

    // Get attendance data for all subjects with class schedule info
    const subjectsWithAttendance = await Promise.all(
      subjects.map(async (subject) => {
        // Get all attendance records for this subject
        const attendanceRecords = await Attendance.find({ subjectId: subject._id })
          .sort({ date: -1, time: 1 });

        // Get registered students for this subject
        const registeredStudents = subject.registeredStudents || [];

        // Group attendance by date (format: YYYY-MM-DD)
        const attendanceByDate = {};

        // Process each attendance record
        attendanceRecords.forEach(record => {
          const dateKey = record.date.toISOString().split('T')[0];

          if (!attendanceByDate[dateKey]) {
            attendanceByDate[dateKey] = {
              records: [],
              schedules: subject.classSchedule || [] // Include class schedules for this date
            };
          }

          // Add the attendance record with schedule info if available
          attendanceByDate[dateKey].records.push({
            id: record._id,
            studentName: record.studentName,
            rollNo: record.rollNo,
            discipline: record.discipline,
            time: record.time,
            title: subject.subjectTitle,
            status: 'Present',
            scheduleDay: record.scheduleDay, // New field to store which schedule day it was marked for
            scheduleTime: record.scheduleTime // Store the schedule time range
          });
        });

        return {
          id: subject._id.toString(),
          title: subject.subjectTitle,
          departmentOffering: subject.departmentOffering,
          code: subject.subjectCode,
          creditHours: subject.creditHours,
          session: subject.session,
          semester: subject.semester,
          createdAt: subject.createdDate,
          status: subject.status,
          totalRegisteredStudents: registeredStudents.length,
          registeredStudents: registeredStudents,
          classSchedule: subject.classSchedule || [],
          attendance: attendanceByDate
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Active subjects with attendance data fetched successfully',
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

// Update createAttendance to include schedule information
export const createAttendance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      studentName,
      rollNo,
      discipline,
      time,
      subjectId,
      date,
      ipAddress,
      scheduleDay,
      scheduleTime
    } = req.body;

    if (!studentName || !rollNo || !discipline || !time || !subjectId || !ipAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Check if subject exists
    const subject = await Subject.findById(subjectId).session(session);
    if (!subject) {
      await session.abortTransaction();
      session.endSession();
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
        await session.abortTransaction();
        session.endSession();
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
      await session.abortTransaction();
      session.endSession();
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

    // ✅ CONDITION 2: Check if attendance record already exists for the SAME SCHEDULE
    const existingAttendance = await Attendance.findOne({
      rollNo,
      subjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      // Only check schedule if it's provided
      ...(scheduleDay && scheduleTime ? {
        scheduleDay: scheduleDay,
        scheduleTime: scheduleTime
      } : {})
    }).session(session);

    if (existingAttendance) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: scheduleDay && scheduleTime
          ? 'Attendance already marked for this student in this class schedule'
          : 'Attendance already marked for this student today'
      });
    }

    // ✅ CONDITION 3: Check if same IP address has been used for any attendance on the same day
    // This prevents device sharing across students, but allows the same device for different schedules
    const existingIPAttendance = await Attendance.findOne({
      ipAddress,
      subjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      // If schedule info is provided, check for the same schedule
      ...(scheduleDay && scheduleTime ? {
        scheduleDay: scheduleDay,
        scheduleTime: scheduleTime
      } : {})
    }).session(session);

    if (existingIPAttendance) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: scheduleDay && scheduleTime
          ? 'This device has already been used for attendance in this class schedule'
          : 'This device has already been used for attendance today'
      });
    }

    // Create new attendance record with schedule information
    const attendance = new Attendance({
      studentName,
      rollNo,
      discipline,
      time,
      subjectId,
      date: attendanceDate,
      ipAddress,
      scheduleDay: scheduleDay || null,
      scheduleTime: scheduleTime || null
    });

    const savedAttendance = await attendance.save({ session });

    // Populate subject details in response
    await savedAttendance.populate('subjectId', 'subjectTitle departmentOffering subjectCode classSchedule');

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: savedAttendance
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

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
      // Check which index caused the duplicate
      if (error.message.includes('unique_attendance_per_schedule')) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for this student in this class schedule'
        });
      } else if (error.message.includes('unique_attendance_legacy')) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for this student today'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Duplicate attendance record'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error creating attendance record',
      error: error.message
    });
  }
};

// New endpoint to get attendance for a specific schedule
export const getAttendanceBySchedule = async (req, res) => {
  try {
    const { subjectId, date, scheduleDay, scheduleTime } = req.query;

    if (!subjectId || !date || !scheduleDay || !scheduleTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subjectId, date, scheduleDay, and scheduleTime'
      });
    }

    // Validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Find the subject
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Parse date
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get attendance records for this subject, date, and specific schedule
    const attendanceRecords = await Attendance.find({
      subjectId,
      date: { $gte: startOfDay, $lte: endOfDay },
      scheduleDay: scheduleDay,
      scheduleTime: scheduleTime
    });

    // Get registered students
    const registeredStudents = subject.registeredStudents || [];

    // Create a map of present students for this specific schedule
    const presentStudentsMap = {};
    attendanceRecords.forEach(record => {
      presentStudentsMap[record.rollNo] = record;
    });

    // Combine registered students with attendance status for this schedule
    const studentsWithStatus = registeredStudents.map(student => ({
      id: presentStudentsMap[student.registrationNo]?._id || null,
      studentName: student.studentName,
      rollNo: student.registrationNo,
      discipline: student.discipline,
      time: presentStudentsMap[student.registrationNo]?.time || null,
      title: subject.subjectTitle,
      status: presentStudentsMap[student.registrationNo] ? 'Present' : 'Absent',
      scheduleDay: scheduleDay,
      scheduleTime: scheduleTime
    }));

    // Sort students by roll number
    studentsWithStatus.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    res.status(200).json({
      success: true,
      data: {
        subjectId: subject._id,
        subjectTitle: subject.subjectTitle,
        date: date,
        scheduleDay: scheduleDay,
        scheduleTime: scheduleTime,
        students: studentsWithStatus,
        totalPresent: attendanceRecords.length,
        totalAbsent: registeredStudents.length - attendanceRecords.length,
        totalRegistered: registeredStudents.length
      }
    });
  } catch (error) {
    console.error('Error fetching attendance by schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance data',
      error: error.message
    });
  }
};

// Update the existing endpoints
export const getRegisteredStudentByRollNo = async (req, res) => {
  try {
    const { subjectId, rollNo } = req.params;

    if (!rollNo || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roll number and subject ID'
      });
    }

    // Validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Find the subject and check if student is registered
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if student is registered in this subject
    const registeredStudent = subject.registeredStudents?.find(
      student => student.registrationNo === rollNo
    );

    if (!registeredStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not registered in this course'
      });
    }

    // Get discipline from the registered student data
    const discipline = registeredStudent.discipline || '';

    res.status(200).json({
      success: true,
      data: {
        rollNo: registeredStudent.registrationNo,
        studentName: registeredStudent.studentName,
        discipline: discipline,
        isRegistered: true
      }
    });

  } catch (error) {
    console.error('Error fetching registered student by roll no:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student details',
      error: error.message
    });
  }
};

// Keep existing updateAttendance and deleteAttendance functions
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      rollNo,
      discipline,
      time,
      date,
      scheduleDay,
      scheduleTime
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
    if (rollNo || date || scheduleDay || scheduleTime) {
      const duplicateAttendance = await Attendance.findOne({
        rollNo: rollNo || existingAttendance.rollNo,
        date: new Date(date || existingAttendance.date),
        subjectId: existingAttendance.subjectId,
        scheduleDay: scheduleDay || existingAttendance.scheduleDay,
        scheduleTime: scheduleTime || existingAttendance.scheduleTime,
        _id: { $ne: id }
      });

      if (duplicateAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already exists for this student in this class schedule'
        });
      }
    }

    // Update attendance record
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      {
        studentName,
        rollNo,
        discipline,
        time,
        date: date ? new Date(date) : existingAttendance.date,
        scheduleDay: scheduleDay || existingAttendance.scheduleDay,
        scheduleTime: scheduleTime || existingAttendance.scheduleTime
      },
      { new: true, runValidators: true }
    ).populate('subjectId', 'subjectTitle departmentOffering subjectCode classSchedule');

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