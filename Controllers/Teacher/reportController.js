import Attendance from '../../Models/attendanceModel.js';
import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

export const getCourseAttendanceReport = async (req, res) => {
  try {
    const { subjectId, fromDate, toDate, teacherId } = req.query;

    // Validate required parameters
    if (!subjectId || !fromDate || !toDate || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: subjectId, fromDate, toDate, teacherId'
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID or teacher ID format'
      });
    }

    // Validate date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'From date cannot be greater than to date'
      });
    }

    // Set time boundaries for the date range
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to access it'
      });
    }

    // Get all attendance records for this subject within the date range
    const attendanceRecords = await Attendance.find({
      subjectId: subjectId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1, time: 1 });

    // Get registered students for this subject
    const registeredStudents = subject.registeredStudents || [];

    // If no registered students, return empty report
    if (registeredStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No registered students found for this subject',
        data: {
          subjectInfo: {
            id: subject._id,
            title: subject.subjectTitle,
            code: subject.subjectCode,
            department: subject.departmentOffering,
            semester: subject.semester,
            session: subject.session,
            creditHours: subject.creditHours
          },
          dateRange: {
            fromDate: fromDate,
            toDate: toDate
          },
          summary: {
            totalStudents: 0,
            totalDays: 0,
            students: []
          }
        }
      });
    }

    // Get all unique dates in the range
    const allDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Skip weekends? (Optional - remove if you want all days)
      // const dayOfWeek = currentDate.getDay();
      // if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
      allDates.push(new Date(currentDate).toISOString().split('T')[0]);
      // }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create a map of attendance records by date and roll number
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!attendanceMap[dateKey]) {
        attendanceMap[dateKey] = {};
      }
      attendanceMap[dateKey][record.rollNo] = {
        id: record._id,
        studentName: record.studentName,
        rollNo: record.rollNo,
        discipline: record.discipline,
        time: record.time,
        status: 'Present'
      };
    });

    // Generate report for each student
    const studentsReport = registeredStudents.map(student => {
      // Initialize attendance array for all dates
      const attendance = allDates.map(date => {
        const presentRecord = attendanceMap[date]?.[student.registrationNo];
        
        if (presentRecord) {
          return {
            date,
            status: 'Present',
            time: presentRecord.time,
            attendanceId: presentRecord.id
          };
        } else {
          return {
            date,
            status: 'Absent',
            time: null,
            attendanceId: null
          };
        }
      });

      // Calculate statistics
      const presentCount = attendance.filter(a => a.status === 'Present').length;
      const absentCount = attendance.filter(a => a.status === 'Absent').length;
      const totalDays = attendance.length;
      const percentage = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : '0.0';

      return {
        studentId: student._id,
        name: student.studentName,
        rollNo: student.registrationNo,
        attendance,
        presentCount,
        absentCount,
        totalDays,
        percentage
      };
    });

    // Sort students by roll number
    studentsReport.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    // Calculate overall statistics
    const totalStudents = studentsReport.length;
    const totalDays = allDates.length;
    const overallAttendance = studentsReport.reduce((acc, student) => {
      return acc + student.presentCount;
    }, 0);
    const overallPercentage = (totalStudents * totalDays) > 0 
      ? ((overallAttendance / (totalStudents * totalDays)) * 100).toFixed(1) 
      : '0.0';

    // Prepare the report data
    const reportData = {
      subjectInfo: {
        id: subject._id,
        title: subject.subjectTitle,
        code: subject.subjectCode,
        department: subject.departmentOffering,
        semester: subject.semester,
        session: subject.session,
        creditHours: subject.creditHours
      },
      dateRange: {
        fromDate: fromDate,
        toDate: toDate,
        totalDays: totalDays
      },
      summary: {
        totalStudents,
        totalDays,
        overallPresentCount: overallAttendance,
        overallAbsentCount: (totalStudents * totalDays) - overallAttendance,
        overallPercentage,
        attendanceDates: allDates
      },
      students: studentsReport
    };

    res.status(200).json({
      success: true,
      message: 'Course attendance report generated successfully',
      data: reportData
    });

  } catch (error) {
    console.error('Error generating course attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating attendance report',
      error: error.message
    });
  }
};

export const getCoursesSummaryReport = async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    // Get all subjects for this teacher
    const subjects = await Subject.find({ 
      userId: teacherId,
      status: 'Active' 
    });

    if (!subjects || subjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subjects found for this teacher'
      });
    }

    // Get attendance summary for each subject
    const subjectsSummary = await Promise.all(subjects.map(async (subject) => {
      // Get total attendance records for this subject
      const totalAttendance = await Attendance.countDocuments({
        subjectId: subject._id
      });

      // Get unique students who attended
      const uniqueStudents = await Attendance.distinct('rollNo', {
        subjectId: subject._id
      });

      // Get attendance for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const monthAttendance = await Attendance.countDocuments({
        subjectId: subject._id,
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      });

      return {
        subjectId: subject._id,
        subjectTitle: subject.subjectTitle,
        subjectCode: subject.subjectCode,
        semester: subject.semester,
        session: subject.session,
        registeredStudents: subject.registeredStudents?.length || 0,
        totalAttendanceRecords: totalAttendance,
        uniqueStudentsAttended: uniqueStudents.length,
        monthAttendanceRecords: monthAttendance,
        status: subject.status
      };
    }));

    res.status(200).json({
      success: true,
      message: 'Courses summary report generated successfully',
      data: {
        teacherId,
        totalSubjects: subjectsSummary.length,
        subjects: subjectsSummary
      }
    });

  } catch (error) {
    console.error('Error generating courses summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating courses summary',
      error: error.message
    });
  }
};

export const exportAttendanceCSV = async (req, res) => {
  try {
    const { subjectId, fromDate, toDate, teacherId } = req.query;

    // Reuse the report generation logic
    const reportResponse = await getCourseAttendanceReport({
      query: { subjectId, fromDate, toDate, teacherId }
    }, {
      status: (code) => ({
        json: (data) => ({ statusCode: code, data })
      })
    });

    // If there was an error in the report generation
    if (reportResponse.statusCode && reportResponse.statusCode !== 200) {
      return res.status(reportResponse.statusCode).json(reportResponse.data);
    }

    const reportData = reportResponse.data?.data;

    if (!reportData || !reportData.students || reportData.students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data available for export'
      });
    }

    // Generate CSV content
    let csvContent = '';

    // Add header with subject info
    csvContent += `Course: ${reportData.subjectInfo.title} (${reportData.subjectInfo.code})\n`;
    csvContent += `Department: ${reportData.subjectInfo.department}\n`;
    csvContent += `Semester: ${reportData.subjectInfo.semester}, Session: ${reportData.subjectInfo.session}\n`;
    csvContent += `Date Range: ${fromDate} to ${toDate}\n`;
    csvContent += `Total Days: ${reportData.summary.totalDays}\n\n`;

    // Add column headers
    csvContent += 'Student Name,Roll No.,';
    
    // Add date columns
    reportData.summary.attendanceDates.forEach(date => {
      csvContent += `${date},`;
    });
    
    csvContent += 'Present Count,Absent Count,Percentage\n';

    // Add student data
    reportData.students.forEach(student => {
      const row = [
        student.name,
        student.rollNo,
        ...student.attendance.map(a => a.status),
        student.presentCount,
        student.absentCount,
        student.percentage + '%'
      ];
      csvContent += row.join(',') + '\n';
    });

    // Add summary row
    csvContent += '\n';
    csvContent += `Summary,,${','.repeat(reportData.summary.totalDays)}${reportData.summary.overallPresentCount},${reportData.summary.overallAbsentCount},${reportData.summary.overallPercentage}%\n`;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${subjectId}_${fromDate}_to_${toDate}.csv`);
    
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting CSV',
      error: error.message
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }

    // Get total subjects
    const totalSubjects = await Subject.countDocuments({ 
      userId: teacherId,
      status: 'Active'
    });

    // Get total students (unique across all subjects)
    const subjects = await Subject.find({ 
      userId: teacherId,
      status: 'Active'
    }).select('registeredStudents');

    const allStudents = new Set();
    subjects.forEach(subject => {
      subject.registeredStudents?.forEach(student => {
        allStudents.add(student.registrationNo);
      });
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.countDocuments({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get this week's attendance
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekAttendance = await Attendance.countDocuments({
      date: { $gte: weekAgo }
    });

    // Get this month's attendance
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const monthAttendance = await Attendance.countDocuments({
      date: { $gte: monthAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalSubjects,
        totalStudents: allStudents.size,
        todayAttendance,
        weekAttendance,
        monthAttendance
      }
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard statistics',
      error: error.message
    });
  }
};
