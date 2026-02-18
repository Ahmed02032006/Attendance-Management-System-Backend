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
          createdAt: studentCount.createdAt,
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
