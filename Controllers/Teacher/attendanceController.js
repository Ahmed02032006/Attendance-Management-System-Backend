import Attendance from '../../Models/attendanceModel.js';
import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

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
      scheduleId, // New field
      date,
      ipAddress
    } = req.body;

    if (!studentName || !rollNo || !discipline || !time || !subjectId || !scheduleId || !ipAddress) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: studentName, rollNo, discipline, time, subjectId, scheduleId, ipAddress'
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

    // Validate scheduleId
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID'
      });
    }

    // Check if subject exists and has the schedule
    const subject = await Subject.findById(subjectId).session(session);
    if (!subject) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Verify that the schedule belongs to this subject
    const scheduleExists = subject.classSchedule.some(
      schedule => schedule._id.toString() === scheduleId
    );

    if (!scheduleExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Schedule not found for this subject'
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

    // ✅ CONDITION 2: Check if attendance already exists for same student, subject, schedule, and date
    const existingAttendance = await Attendance.findOne({
      rollNo,
      subjectId,
      scheduleId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).session(session);

    if (existingAttendance) {
      console.log('Found existing attendance:', existingAttendance);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student in this class schedule'
      });
    }

    // ✅ CONDITION 3: Check if same IP address has been used for this schedule on the same day
    const existingIPAttendance = await Attendance.findOne({
      ipAddress,
      subjectId,
      scheduleId, // Include scheduleId in check
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).session(session);

    if (existingIPAttendance) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'This device has already been used for this class schedule today'
      });
    }

    // Create new attendance record with scheduleId
    const attendance = new Attendance({
      studentName,
      rollNo,
      discipline,
      time,
      subjectId,
      scheduleId, // Include scheduleId
      date: attendanceDate,
      ipAddress
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
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this student in this class schedule'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating attendance record',
      error: error.message
    });
  }
};

// Update getSubjectsByUserWithAttendance to include schedule-based grouping
export const getSubjectsByUserWithAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { scheduleId } = req.query; // Optional: filter by schedule

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

    // Get attendance data for all subjects
    const subjectsWithAttendance = await Promise.all(
      subjects.map(async (subject) => {
        // Get all attendance records for this subject
        const attendanceQuery = { subjectId: subject._id };
        if (scheduleId) {
          attendanceQuery.scheduleId = scheduleId;
        }

        const attendanceRecords = await Attendance.find(attendanceQuery)
          .sort({ date: -1, time: 1 });

        // Get registered students for this subject
        const registeredStudents = subject.registeredStudents || [];

        // Group attendance by date and schedule
        const attendanceByDateAndSchedule = {};

        // Process each attendance record
        attendanceRecords.forEach(record => {
          const dateKey = record.date.toISOString().split('T')[0];
          const scheduleKey = record.scheduleId?.toString() || 'unknown';

          if (!attendanceByDateAndSchedule[dateKey]) {
            attendanceByDateAndSchedule[dateKey] = {};
          }

          if (!attendanceByDateAndSchedule[dateKey][scheduleKey]) {
            // Initialize with all registered students marked as absent
            attendanceByDateAndSchedule[dateKey][scheduleKey] = {
              schedule: subject.classSchedule.find(s => s._id.toString() === scheduleKey) || null,
              students: registeredStudents.map(student => ({
                id: null,
                studentName: student.studentName,
                rollNo: student.registrationNo,
                discipline: null,
                time: null,
                title: subject.subjectTitle,
                status: 'Absent'
              }))
            };
          }

          // Find and update the present student in the array
          const studentIndex = attendanceByDateAndSchedule[dateKey][scheduleKey].students.findIndex(
            s => s.rollNo === record.rollNo
          );

          if (studentIndex !== -1) {
            // Student is registered - mark as present
            attendanceByDateAndSchedule[dateKey][scheduleKey].students[studentIndex] = {
              id: record._id,
              studentName: record.studentName,
              rollNo: record.rollNo,
              discipline: record.discipline,
              time: record.time,
              title: subject.subjectTitle,
              status: 'Present'
            };
          } else {
            // Student is NOT registered - still show them but mark accordingly
            attendanceByDateAndSchedule[dateKey][scheduleKey].students.push({
              id: record._id,
              studentName: record.studentName,
              rollNo: record.rollNo,
              discipline: record.discipline,
              time: record.time,
              title: subject.subjectTitle,
              status: 'Not Registered'
            });
          }
        });

        // Sort students by roll number for each schedule
        Object.keys(attendanceByDateAndSchedule).forEach(date => {
          Object.keys(attendanceByDateAndSchedule[date]).forEach(scheduleKey => {
            attendanceByDateAndSchedule[date][scheduleKey].students.sort((a, b) =>
              a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
            );
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
          classSchedule: subject.classSchedule || [],
          attendance: attendanceByDateAndSchedule
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

// Get attendance records for a specific schedule
export const getAttendanceBySchedule = async (req, res) => {
  try {
    const { subjectId, scheduleId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID or schedule ID'
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

    // Find the schedule
    const schedule = subject.classSchedule.find(s => s._id.toString() === scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Build date query
    let dateQuery = {};
    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateQuery = {
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      };
    }

    // Get attendance records for this schedule
    const attendanceRecords = await Attendance.find({
      subjectId,
      scheduleId,
      ...dateQuery
    }).sort({ date: -1, time: 1 });

    // Get registered students
    const registeredStudents = subject.registeredStudents || [];

    // Combine with registered students
    let attendanceByDate = {};

    if (date) {
      // For specific date, create full list with absent students
      const dateKey = new Date(date).toISOString().split('T')[0];

      attendanceByDate[dateKey] = {
        schedule: schedule,
        students: registeredStudents.map(student => {
          const presentRecord = attendanceRecords.find(r => r.rollNo === student.registrationNo);
          return presentRecord ? {
            id: presentRecord._id,
            studentName: presentRecord.studentName,
            rollNo: presentRecord.rollNo,
            discipline: presentRecord.discipline,
            time: presentRecord.time,
            title: subject.subjectTitle,
            status: 'Present'
          } : {
            id: null,
            studentName: student.studentName,
            rollNo: student.registrationNo,
            discipline: null,
            time: null,
            title: subject.subjectTitle,
            status: 'Absent'
          };
        })
      };
    } else {
      // Group by date
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toISOString().split('T')[0];
        if (!attendanceByDate[dateKey]) {
          attendanceByDate[dateKey] = {
            schedule: schedule,
            students: []
          };
        }
        attendanceByDate[dateKey].students.push({
          id: record._id,
          studentName: record.studentName,
          rollNo: record.rollNo,
          discipline: record.discipline,
          time: record.time,
          title: subject.subjectTitle,
          status: 'Present'
        });
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance records fetched successfully',
      data: {
        subjectId: subject._id,
        subjectTitle: subject.subjectTitle,
        schedule: schedule,
        attendanceByDate: attendanceByDate
      }
    });

  } catch (error) {
    console.error('Error fetching attendance by schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records',
      error: error.message
    });
  }
};

// Get registered student by roll no (updated)
export const getRegisteredStudentByRollNo = async (req, res) => {
  try {
    const { subjectId, rollNo } = req.params;
    const { scheduleId } = req.query; // Optional

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

    // If scheduleId is provided, check if already marked for today
    let alreadyMarked = false;
    if (scheduleId) {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAttendance = await Attendance.findOne({
        rollNo,
        subjectId,
        scheduleId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      alreadyMarked = !!existingAttendance;
    }

    res.status(200).json({
      success: true,
      data: {
        rollNo: registeredStudent.registrationNo,
        studentName: registeredStudent.studentName,
        discipline: registeredStudent.discipline,
        isRegistered: true,
        alreadyMarked: alreadyMarked
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

// Keep other controller functions (updateAttendance, deleteAttendance) but update them to handle scheduleId
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      rollNo,
      discipline,
      time,
      date,
      scheduleId
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

    // Check for duplicate attendance if rollNo, scheduleId, or date is being changed
    if (rollNo || scheduleId || date) {
      const duplicateAttendance = await Attendance.findOne({
        rollNo: rollNo || existingAttendance.rollNo,
        scheduleId: scheduleId || existingAttendance.scheduleId,
        date: new Date(date || existingAttendance.date),
        subjectId: existingAttendance.subjectId,
        _id: { $ne: id }
      });

      if (duplicateAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Attendance already exists for this student in this schedule on this date'
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
        scheduleId: scheduleId || existingAttendance.scheduleId,
        date: date ? new Date(date) : existingAttendance.date
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