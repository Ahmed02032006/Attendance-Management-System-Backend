import Attendance from '../../Models/attendanceModel.js';
import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

export const getSubjectAttendanceReport = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { fromDate, toDate, teacherId } = req.query;

    // Validate required parameters
    if (!subjectId || !fromDate || !toDate || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subjectId, fromDate, toDate, and teacherId'
      });
    }

    // Validate subjectId
    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Validate dates
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Set time boundaries for the date range
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Check if fromDate is not greater than toDate
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'From date cannot be greater than to date'
      });
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    }).select('subjectTitle subjectCode departmentOffering semester session registeredStudents');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to access it'
      });
    }

    // Get registered students for this subject
    const registeredStudents = subject.registeredStudents || [];

    if (registeredStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No registered students found for this subject',
        data: {
          subjectDetails: {
            id: subject._id,
            title: subject.subjectTitle,
            code: subject.subjectCode,
            department: subject.departmentOffering,
            semester: subject.semester,
            session: subject.session
          },
          dateRange: {
            fromDate: fromDate,
            toDate: toDate
          },
          totalDays: 0,
          students: []
        }
      });
    }

    // Get all attendance records for this subject within the date range
    const attendanceRecords = await Attendance.find({
      subjectId: subjectId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1, time: 1 }); // Sort by date ascending, then time

    // Get all unique dates where attendance was marked
    const attendanceDates = [...new Set(
      attendanceRecords.map(record => 
        record.date.toISOString().split('T')[0]
      )
    )].sort(); // Sort dates ascending

    // Create a map for quick lookup of attendance by rollNo and date
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const key = `${record.rollNo}_${dateKey}`;
      attendanceMap.set(key, {
        id: record._id,
        studentName: record.studentName,
        rollNo: record.rollNo,
        discipline: record.discipline,
        time: record.time,
        date: dateKey,
        status: 'Present'
      });
    });

    // Build the report data for each student
    const reportData = registeredStudents.map((student, index) => {
      // Initialize attendance array for all dates in the range
      const attendance = attendanceDates.map(date => {
        const key = `${student.registrationNo}_${date}`;
        const presentRecord = attendanceMap.get(key);
        
        if (presentRecord) {
          return {
            date: date,
            status: 'Present',
            time: presentRecord.time,
            discipline: presentRecord.discipline,
            attendanceId: presentRecord.id
          };
        } else {
          return {
            date: date,
            status: 'Absent',
            time: null,
            discipline: null,
            attendanceId: null
          };
        }
      });

      // Calculate present and absent counts
      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const absentCount = attendance.length - presentCount;
      const percentage = attendance.length > 0 
        ? ((presentCount / attendance.length) * 100).toFixed(1)
        : 0;

      return {
        id: index + 1,
        studentId: student._id,
        name: student.studentName,
        rollNo: student.registrationNo,
        registrationNo: student.registrationNo,
        presentCount,
        absentCount,
        percentage: parseFloat(percentage),
        attendance
      };
    });

    // Sort students by roll number (alphanumeric sort)
    reportData.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    // Calculate summary statistics
    const totalStudents = reportData.length;
    const totalDays = attendanceDates.length;
    
    const summary = {
      totalStudents,
      totalDays,
      dates: attendanceDates,
      averageAttendance: totalStudents > 0 
        ? (reportData.reduce((sum, student) => sum + student.percentage, 0) / totalStudents).toFixed(1)
        : 0,
      studentsAbove75: reportData.filter(s => s.percentage >= 75).length,
      studentsBelow75: reportData.filter(s => s.percentage < 75 && s.percentage >= 0).length,
      studentsBelow50: reportData.filter(s => s.percentage < 50).length,
      studentsBelow25: reportData.filter(s => s.percentage < 25).length
    };

    res.status(200).json({
      success: true,
      message: 'Attendance report generated successfully',
      data: {
        subjectDetails: {
          id: subject._id,
          title: subject.subjectTitle,
          code: subject.subjectCode,
          department: subject.departmentOffering,
          semester: subject.semester,
          session: subject.session
        },
        dateRange: {
          fromDate: fromDate,
          toDate: toDate
        },
        summary,
        students: reportData
      }
    });

  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating attendance report',
      error: error.message
    });
  }
};

export const exportAttendanceReport = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { fromDate, toDate, teacherId, format = 'csv' } = req.query;

    // Reuse the same logic but format differently for export
    const reportResponse = await getSubjectAttendanceReport({
      params: { subjectId },
      query: { fromDate, toDate, teacherId }
    }, {
      status: () => ({ json: () => {} }),
      json: (data) => data
    });

    // This is a simplified version - you might want to call the function directly
    // or restructure to avoid duplicate code

    res.status(200).json({
      success: true,
      message: 'Report exported successfully',
      data: reportResponse
    });

  } catch (error) {
    console.error('Error exporting attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting attendance report',
      error: error.message
    });
  }
};
