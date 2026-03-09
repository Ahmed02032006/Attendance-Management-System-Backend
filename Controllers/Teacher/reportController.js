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
    }).select('subjectTitle subjectCode departmentOffering semester session registeredStudents classSchedule');

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
          totalDays: 0, // Total days when attendance was marked
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
    }).sort({ date: 1, time: 1 });

    // Get UNIQUE DATES when attendance was marked (regardless of how many schedules per day)
    const uniqueMarkedDates = [...new Set(
      attendanceRecords.map(record => 
        record.date.toISOString().split('T')[0]
      )
    )].sort();

    // For each date, we need to know if a student was present in ANY schedule
    // Create a map of student attendance by date (if present in any schedule)
    const studentAttendanceByDate = new Map();
    
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const studentKey = `${record.rollNo}_${dateKey}`;
      
      // If student is marked present in ANY schedule on this date, mark them as present
      if (!studentAttendanceByDate.has(studentKey)) {
        studentAttendanceByDate.set(studentKey, {
          id: record._id,
          studentName: record.studentName,
          rollNo: record.rollNo,
          discipline: record.discipline,
          time: record.time,
          date: dateKey,
          status: 'Present',
          schedules: [] // Store all schedules they attended
        });
      }
      
      // Add schedule information to the existing record
      const existingRecord = studentAttendanceByDate.get(studentKey);
      existingRecord.schedules.push({
        scheduleId: record.scheduleId,
        time: record.time
      });
    });

    // Build the report data for each student
    const reportData = registeredStudents.map((student, index) => {
      // Initialize attendance array for all marked dates
      const attendance = uniqueMarkedDates.map(date => {
        const studentKey = `${student.registrationNo}_${date}`;
        const presentRecord = studentAttendanceByDate.get(studentKey);
        
        if (presentRecord) {
          return {
            date: date,
            status: 'Present',
            time: presentRecord.time,
            discipline: presentRecord.discipline,
            attendanceId: presentRecord.id,
            schedules: presentRecord.schedules // Show which schedules they attended
          };
        } else {
          return {
            date: date,
            status: 'Absent',
            time: null,
            discipline: null,
            attendanceId: null,
            schedules: [] // No schedules attended
          };
        }
      });

      // Calculate present and absent counts (based on days, not schedules)
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
        presentCount, // Number of days present
        absentCount,  // Number of days absent
        percentage: parseFloat(percentage),
        attendance // Daily attendance with schedule details
      };
    });

    // Sort students by roll number
    reportData.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    // Calculate summary statistics
    const totalStudents = reportData.length;
    const totalDays = uniqueMarkedDates.length; // This counts DAYS, not schedules
    
    const summary = {
      totalStudents,
      totalDays, // Total number of days when attendance was marked
      dates: uniqueMarkedDates,
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

export const getStudentAttendanceDetails = async (req, res) => {
  try {
    const { rollNo, subjectId } = req.params;
    const { fromDate, toDate, teacherId } = req.query;

    // Validate required parameters
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

    // If teacherId is provided, verify the subject belongs to this teacher
    if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher ID'
        });
      }

      const subject = await Subject.findOne({
        _id: subjectId,
        userId: teacherId
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found or you do not have permission'
        });
      }
    }

    // Get the subject details with class schedules
    const subject = await Subject.findById(subjectId)
      .select('classSchedule registeredStudents subjectTitle subjectCode');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if student is registered in this subject
    const studentInfo = subject.registeredStudents?.find(
      student => student.registrationNo === rollNo
    );

    if (!studentInfo) {
      return res.status(404).json({
        success: false,
        message: 'Student is not registered in this subject'
      });
    }

    // Validate and parse dates
    let startDate, endDate;
    let dateFilter = {};
    
    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: 'From date cannot be greater than to date'
        });
      }

      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // STEP 1: Get ALL unique dates when attendance was marked for this subject in the date range
    // This ensures we only count days when teacher actually marked attendance
    const markedDatesQuery = Attendance.distinct('date', {
      subjectId: subjectId,
      ...dateFilter
    });

    const markedDatesArray = await markedDatesQuery;
    
    // Convert to unique date strings (without time)
    const uniqueMarkedDateStrings = [...new Set(
      markedDatesArray.map(date => 
        new Date(date).toISOString().split('T')[0]
      )
    )].sort();

    // STEP 2: Get attendance records for this specific student
    const studentAttendanceRecords = await Attendance.find({
      rollNo: rollNo,
      subjectId: subjectId,
      ...dateFilter
    }).sort({ date: -1, time: 1 });

    // STEP 3: Create a map of dates where this student was present
    // Student is considered present on a date if they attended ANY schedule
    const studentPresentDates = new Map();
    
    studentAttendanceRecords.forEach(record => {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      
      if (!studentPresentDates.has(dateKey)) {
        studentPresentDates.set(dateKey, {
          date: dateKey,
          schedules: []
        });
      }
      
      // Add schedule information
      const dateEntry = studentPresentDates.get(dateKey);
      dateEntry.schedules.push({
        scheduleId: record.scheduleId,
        time: record.time,
        ipAddress: record.ipAddress,
        discipline: record.discipline,
        attendanceId: record._id
      });
    });

    // STEP 4: Build attendance data for ALL marked dates
    const attendanceByDate = [];
    let presentCount = 0;

    uniqueMarkedDateStrings.forEach(dateKey => {
      const isPresent = studentPresentDates.has(dateKey);
      
      if (isPresent) {
        presentCount++;
      }
      
      attendanceByDate.push({
        date: dateKey,
        status: isPresent ? 'Present' : 'Absent',
        schedules: isPresent ? studentPresentDates.get(dateKey).schedules : []
      });
    });

    // Sort dates in descending order (most recent first)
    attendanceByDate.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate statistics
    const totalMarkedDays = uniqueMarkedDateStrings.length; // Same for all students
    const absentCount = totalMarkedDays - presentCount;
    const attendancePercentage = totalMarkedDays > 0 
      ? ((presentCount / totalMarkedDays) * 100).toFixed(1)
      : 0;

    const summary = {
      studentInfo: {
        name: studentInfo.studentName,
        rollNo: studentInfo.registrationNo,
        discipline: studentInfo.discipline
      },
      subjectInfo: {
        id: subject._id,
        title: subject.subjectTitle,
        code: subject.subjectCode,
        classSchedule: subject.classSchedule
      },
      dateRange: fromDate && toDate ? { fromDate, toDate } : null,
      totalMarkedDays: totalMarkedDays, // This is SAME for all students
      presentDays: presentCount,
      absentDays: absentCount,
      attendancePercentage: parseFloat(attendancePercentage)
    };

    res.status(200).json({
      success: true,
      message: 'Student attendance details fetched successfully',
      data: {
        summary,
        attendanceByDate // Daily attendance with schedule details
      }
    });

  } catch (error) {
    console.error('Error fetching student attendance details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student attendance details',
      error: error.message
    });
  }
};

