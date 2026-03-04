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

    // Get all subjects for the user - DON'T filter by status initially
    // This will get ALL subjects for the user
    const subjects = await Subject.find({ userId });

    if (!subjects || subjects.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No subjects found for this user',
        data: {
          totalCourses: 0,
          totalStudents: 0,
          totalAttendanceRecords: 0,
          todayAttendance: 0,
          averageAttendance: 0,
          attendanceRate: 0,
          mostActiveSubject: 'N/A',
          attendanceBySubject: {},
          attendanceTrend: []
        }
      });
    }

    const subjectIds = subjects.map(subject => subject._id);
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all attendance records for these subjects
    const attendanceRecords = await Attendance.find({
      subjectId: { $in: subjectIds }
    }).sort({ date: -1 });

    // Calculate total unique students across all subjects
    const uniqueStudentsSet = new Set();
    subjects.forEach(subject => {
      if (subject.registeredStudents && subject.registeredStudents.length > 0) {
        subject.registeredStudents.forEach(student => {
          uniqueStudentsSet.add(student.registrationNo);
        });
      }
    });

    // Calculate total attendance records
    const totalAttendanceRecords = attendanceRecords.length;

    // Calculate today's attendance
    const todayAttendance = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startOfDay && recordDate <= endOfDay;
    }).length;

    // Calculate attendance by date for trend analysis
    const attendanceByDate = {};
    const last30Days = [];
    
    // Get last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      last30Days.push(dateKey);
      attendanceByDate[dateKey] = 0;
    }

    // Count attendance per day
    attendanceRecords.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      if (attendanceByDate.hasOwnProperty(dateKey)) {
        attendanceByDate[dateKey]++;
      }
    });

    // Calculate attendance trend
    const attendanceTrend = last30Days.reverse().map(date => ({
      date,
      count: attendanceByDate[date] || 0
    }));

    // Calculate average attendance per day
    const daysWithAttendance = attendanceTrend.filter(day => day.count > 0).length;
    const averageAttendance = daysWithAttendance > 0 
      ? Math.round(totalAttendanceRecords / daysWithAttendance) 
      : 0;

    // Calculate attendance by subject
    const attendanceBySubject = {};
    subjects.forEach(subject => {
      const subjectAttendance = attendanceRecords.filter(
        record => record.subjectId.toString() === subject._id.toString()
      );
      
      // Get unique attendance days for this subject
      const uniqueDays = new Set();
      subjectAttendance.forEach(record => {
        uniqueDays.add(new Date(record.date).toISOString().split('T')[0]);
      });

      attendanceBySubject[subject._id.toString()] = {
        subjectId: subject._id.toString(),
        subjectTitle: subject.subjectTitle,
        subjectCode: subject.subjectCode,
        totalAttendance: subjectAttendance.length,
        uniqueAttendanceDays: uniqueDays.size,
        registeredStudents: subject.registeredStudents?.length || 0,
        attendancePercentage: subject.registeredStudents?.length > 0 && uniqueDays.size > 0
          ? Math.round((subjectAttendance.length / (subject.registeredStudents.length * uniqueDays.size)) * 100) 
          : 0
      };
    });

    // Find most active subject
    let mostActiveSubject = 'N/A';
    let maxAttendance = 0;
    
    Object.values(attendanceBySubject).forEach(subject => {
      if (subject.totalAttendance > maxAttendance) {
        maxAttendance = subject.totalAttendance;
        mostActiveSubject = subject.subjectTitle;
      }
    });

    // Calculate attendance rate (percentage)
    const totalPossibleAttendance = subjects.reduce((total, subject) => {
      const subjectStats = attendanceBySubject[subject._id.toString()];
      return total + (subjectStats?.uniqueAttendanceDays || 0) * (subject.registeredStudents?.length || 0);
    }, 0);

    const attendanceRate = totalPossibleAttendance > 0 
      ? Math.round((totalAttendanceRecords / totalPossibleAttendance) * 100) 
      : 0;

    // Log for debugging
    console.log('Subjects found:', subjects.length);
    console.log('Subject IDs:', subjectIds);
    console.log('Attendance records found:', attendanceRecords.length);
    console.log('Unique students:', uniqueStudentsSet.size);

    res.status(200).json({
      success: true,
      message: 'Teacher stats fetched successfully',
      data: {
        totalCourses: subjects.length,
        totalStudents: uniqueStudentsSet.size,
        totalAttendanceRecords,
        todayAttendance,
        averageAttendance,
        attendanceRate,
        mostActiveSubject,
        attendanceBySubject,
        attendanceTrend
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