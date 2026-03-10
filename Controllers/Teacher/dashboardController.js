import Subject from '../../Models/subjectModel.js';
import Attendance from '../../Models/attendanceModel.js';
import mongoose from 'mongoose';

const subjectColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500'
];

export const getSubjectsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get subjects for the user
    const subjects = await Subject.find({ userId })
      .sort({ createdAt: -1 });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subjects found for this user'
      });
    }

    // Format subjects with both registered students and attendance counts
    const formattedSubjects = await Promise.all(
      subjects.map(async (subject, index) => {
        // Get unique student count who marked attendance for this subject
        const attendanceStudentCount = await Attendance.distinct('rollNo', { 
          subjectId: subject._id 
        });

        // Get total registered students count
        const registeredStudentsCount = subject.registeredStudents?.length || 0;

        return {
          id: subject._id.toString(),
          departmentOffering: subject.departmentOffering,
          title: subject.subjectTitle,
          code: subject.subjectCode,
          students: attendanceStudentCount.length, // Students who marked attendance
          registeredStudents: registeredStudentsCount, // Total registered students
          createdAt: subject.createdDate,
          color: subjectColors[index % subjectColors.length] // Cycle through colors
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      data: formattedSubjects,
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subjects',
      error: error.message
    });
  }
};

export const getAttendanceData = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get all subjects for the user
    const subjects = await Subject.find({ userId });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subjects found for this user'
      });
    }

    // Get attendance data for all subjects and format like dummy object
    const attendanceData = {};

    for (const subject of subjects) {
      // Get all attendance records for this subject
      const attendanceRecords = await Attendance.find({ subjectId: subject._id })
        .sort({ date: -1, time: 1 });

      // Group attendance by date and schedule
      const attendanceByDateAndSchedule = {};
      
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const scheduleId = record.scheduleId?.toString() || 'unknown';
        
        if (!attendanceByDateAndSchedule[dateKey]) {
          attendanceByDateAndSchedule[dateKey] = {};
        }
        
        if (!attendanceByDateAndSchedule[dateKey][scheduleId]) {
          // Initialize array for this schedule on this date
          attendanceByDateAndSchedule[dateKey][scheduleId] = {
            schedule: null, // We'll add this below
            students: []
          };
        }
        
        attendanceByDateAndSchedule[dateKey][scheduleId].students.push({
          id: record._id.toString(),
          studentName: record.studentName,
          rollNo: record.rollNo,
          time: record.time,
          status: 'Present'
        });
      });

      // Add schedule information to each schedule entry
      // This is important for displaying schedule times
      if (subject.classSchedule && subject.classSchedule.length > 0) {
        // For each date and schedule, try to find the corresponding schedule from the subject
        Object.keys(attendanceByDateAndSchedule).forEach(dateKey => {
          Object.keys(attendanceByDateAndSchedule[dateKey]).forEach(scheduleId => {
            // Find the schedule in the subject's classSchedule array
            const scheduleInfo = subject.classSchedule.find(
              s => s._id.toString() === scheduleId
            );
            
            if (scheduleInfo) {
              attendanceByDateAndSchedule[dateKey][scheduleId].schedule = {
                day: scheduleInfo.day,
                startTime: scheduleInfo.startTime,
                endTime: scheduleInfo.endTime,
                _id: scheduleInfo._id
              };
            }
          });
        });
      }

      // Add to main attendance data object with subject ID as key
      attendanceData[subject._id.toString()] = attendanceByDateAndSchedule;
    }

    res.status(200).json({
      success: true,
      message: 'Attendance data fetched successfully',
      data: attendanceData,
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance data',
      error: error.message
    });
  }
};

export const getTeacherStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get all subjects for the user
    const subjects = await Subject.find({ userId });

    if (!subjects || subjects.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subjects found for this user',
        data: {
          totalCourses: 0,
          totalRegisteredStudents: 0,
          totalAttendanceDays: 0,
          attendancePercentage: 0
        }
      });
    }

    const subjectIds = subjects.map(subject => subject._id);
    
    // 1. TOTAL COURSES
    const totalCourses = subjects.length;

    // 2. TOTAL REGISTERED STUDENTS (unique across all subjects)
    const uniqueStudentsSet = new Set();
    subjects.forEach(subject => {
      if (subject.registeredStudents && subject.registeredStudents.length > 0) {
        subject.registeredStudents.forEach(student => {
          uniqueStudentsSet.add(student.registrationNo);
        });
      }
    });
    const totalRegisteredStudents = uniqueStudentsSet.size;

    // Get all attendance records for these subjects
    const attendanceRecords = await Attendance.find({
      subjectId: { $in: subjectIds }
    });

    // Create a map for quick lookup of attendance records
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const key = `${record.subjectId.toString()}_${record.scheduleId.toString()}_${record.date.toISOString().split('T')[0]}_${record.rollNo}`;
      attendanceMap.set(key, record);
    });

    // Calculate attendance statistics
    let totalPresentCount = 0;
    let totalExpectedCount = 0;
    const uniqueAttendanceDaysSet = new Set();

    // Process each subject
    for (const subject of subjects) {
      const registeredStudents = subject.registeredStudents || [];
      
      if (registeredStudents.length === 0) continue;

      // For each schedule in the subject
      for (const schedule of subject.classSchedule || []) {
        // Get all attendance records for this subject and schedule
        const scheduleAttendanceRecords = attendanceRecords.filter(
          record => record.subjectId.toString() === subject._id.toString() &&
                   record.scheduleId.toString() === schedule._id.toString()
        );

        // Get unique dates for this schedule
        const scheduleDates = new Set();
        scheduleAttendanceRecords.forEach(record => {
          const dateKey = record.date.toISOString().split('T')[0];
          scheduleDates.add(dateKey);
          uniqueAttendanceDaysSet.add(dateKey);
        });

        // For each date when attendance was marked for this schedule
        for (const date of scheduleDates) {
          // Count present students for this date and schedule
          const presentStudents = scheduleAttendanceRecords.filter(
            record => record.date.toISOString().split('T')[0] === date
          );
          
          // Add to total present count
          totalPresentCount += presentStudents.length;
          
          // Expected count is all registered students for this subject
          totalExpectedCount += registeredStudents.length;
        }
      }
    }

    // 3. TOTAL ATTENDANCE DAYS
    const totalAttendanceDays = uniqueAttendanceDaysSet.size;

    // 4. ATTENDANCE PERCENTAGE
    let attendancePercentage = 0;
    if (totalExpectedCount > 0) {
      attendancePercentage = Math.min(
        Math.round((totalPresentCount / totalExpectedCount) * 100),
        100
      );
    }

    // Log for debugging
    console.log('Stats calculated:', {
      totalCourses,
      totalRegisteredStudents,
      totalAttendanceDays,
      attendancePercentage,
      totalPresentCount,
      totalExpectedCount,
      totalAttendanceRecords: attendanceRecords.length
    });

    res.status(200).json({
      success: true,
      message: 'Teacher stats fetched successfully',
      data: {
        totalCourses,
        totalRegisteredStudents,
        totalAttendanceDays,
        attendancePercentage
      }
    });

  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher stats',
      error: error.message
    });
  }
};

