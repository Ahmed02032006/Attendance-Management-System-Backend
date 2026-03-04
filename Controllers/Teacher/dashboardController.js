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

    // Format subjects like dummy object with student counts
    const formattedSubjects = await Promise.all(
      subjects.map(async (subject, index) => {
        // Get unique student count for this subject
        const studentCount = await Attendance.distinct('rollNo', { 
          subjectId: subject._id 
        });

        return {
          id: subject._id.toString(),
          departmentOffering: subject.departmentOffering,
          title: subject.subjectTitle,
          code: subject.subjectCode,
          students: studentCount.length,
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

      // Group attendance by date (format: YYYY-MM-DD)
      const attendanceByDate = {};
      
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        if (!attendanceByDate[dateKey]) {
          attendanceByDate[dateKey] = [];
        }
        
        attendanceByDate[dateKey].push({
          id: record._id.toString(),
          studentName: record.studentName,
          rollNo: record.rollNo,
          time: record.time
        });
      });

      // Add to main attendance data object with subject ID as key
      attendanceData[subject._id.toString()] = attendanceByDate;
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

    // 3. TOTAL ATTENDANCE DAYS (unique days across all subjects)
    const uniqueAttendanceDaysSet = new Set();
    attendanceRecords.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      uniqueAttendanceDaysSet.add(dateKey);
    });
    const totalAttendanceDays = uniqueAttendanceDaysSet.size;

    // 4. ATTENDANCE PERCENTAGE
    let attendancePercentage = 0;
    
    if (totalRegisteredStudents > 0 && totalAttendanceDays > 0) {
      // Calculate total possible attendance (registered students × attendance days)
      const totalPossibleAttendance = totalRegisteredStudents * totalAttendanceDays;
      
      // Total actual attendance records
      const totalActualAttendance = attendanceRecords.length;
      
      // Calculate percentage
      attendancePercentage = Math.round((totalActualAttendance / totalPossibleAttendance) * 100);
    }

    // Log for debugging
    console.log('Stats calculated:', {
      totalCourses,
      totalRegisteredStudents,
      totalAttendanceDays,
      attendancePercentage,
      totalActualAttendance: attendanceRecords.length
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
