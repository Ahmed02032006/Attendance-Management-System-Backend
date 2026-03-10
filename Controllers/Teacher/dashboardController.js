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
      subjectId: { $in: subjects.map(s => s._id) }
    });

    // 3. TOTAL ATTENDANCE DAYS (unique days across all subjects)
    const uniqueAttendanceDaysSet = new Set();
    attendanceRecords.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      uniqueAttendanceDaysSet.add(dateKey);
    });
    const totalAttendanceDays = uniqueAttendanceDaysSet.size;

    // 4. ATTENDANCE PERCENTAGE - FIXED CALCULATION
    let totalExpectedAttendances = 0;
    let totalActualAttendances = 0;

    // For each subject, calculate expected and actual attendances
    for (const subject of subjects) {
      const subjectAttendanceRecords = attendanceRecords.filter(
        record => record.subjectId.toString() === subject._id.toString()
      );

      // Get unique dates for this subject (when attendance was taken)
      const subjectUniqueDates = new Set();
      subjectAttendanceRecords.forEach(record => {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        subjectUniqueDates.add(dateKey);
      });

      // Number of registered students for this subject
      const subjectStudentCount = subject.registeredStudents?.length || 0;

      // For each date, we expect each registered student to be present
      // So expected attendances = number of students × number of attendance days
      const expectedForSubject = subjectStudentCount * subjectUniqueDates.size;
      totalExpectedAttendances += expectedForSubject;

      // Actual attendances is simply the number of attendance records
      totalActualAttendances += subjectAttendanceRecords.length;
    }

    // Calculate attendance percentage
    let attendancePercentage = 0;
    if (totalExpectedAttendances > 0) {
      attendancePercentage = Math.round((totalActualAttendances / totalExpectedAttendances) * 100);
      
      // Cap at 100% (though theoretically it shouldn't exceed 100%)
      attendancePercentage = Math.min(attendancePercentage, 100);
    }

    // Log for debugging
    console.log('Stats calculated:', {
      totalCourses,
      totalRegisteredStudents,
      totalAttendanceDays,
      attendancePercentage,
      totalActualAttendances,
      totalExpectedAttendances,
      subjects: subjects.map(s => ({
        subjectCode: s.subjectCode,
        studentCount: s.registeredStudents?.length || 0,
        attendanceDays: new Set(
          attendanceRecords
            .filter(r => r.subjectId.toString() === s._id.toString())
            .map(r => new Date(r.date).toISOString().split('T')[0])
        ).size
      }))
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
