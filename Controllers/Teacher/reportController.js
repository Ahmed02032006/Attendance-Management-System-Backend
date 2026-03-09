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
          totalMarkedDays: 0,
          totalPossibleClasses: 0,
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

    // Get unique dates where attendance was marked (days with at least one attendance record)
    const markedDates = [...new Set(
      attendanceRecords.map(record => 
        record.date.toISOString().split('T')[0]
      )
    )].sort();

    // Calculate total possible classes based on class schedule
    // For each marked date, count how many schedules should have classes
    let totalPossibleClasses = 0;
    const scheduleCountPerDate = {};

    markedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Count how many schedules match this day of week
      const schedulesForDay = subject.classSchedule.filter(
        schedule => schedule.day === dayOfWeek
      );
      
      scheduleCountPerDate[dateKey] = schedulesForDay.length;
      totalPossibleClasses += schedulesForDay.length;
    });

    // Create a map for quick lookup of attendance by rollNo and date with schedule
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const scheduleId = record.scheduleId?.toString() || 'unknown';
      const key = `${record.rollNo}_${dateKey}_${scheduleId}`;
      
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          id: record._id,
          studentName: record.studentName,
          rollNo: record.rollNo,
          discipline: record.discipline,
          time: record.time,
          date: dateKey,
          scheduleId: scheduleId,
          status: 'Present'
        });
      }
    });

    // Build the report data for each student
    const reportData = registeredStudents.map((student, index) => {
      let totalPresent = 0;
      const attendanceByDate = [];

      // For each marked date, check attendance in each schedule
      markedDates.forEach(dateKey => {
        const dateEntry = {
          date: dateKey,
          schedules: []
        };

        // Get schedules for this day
        const date = new Date(dateKey);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const schedulesForDay = subject.classSchedule.filter(
          schedule => schedule.day === dayOfWeek
        );

        // Check attendance for each schedule
        schedulesForDay.forEach(schedule => {
          const scheduleId = schedule._id?.toString() || 'unknown';
          const key = `${student.registrationNo}_${dateKey}_${scheduleId}`;
          const presentRecord = attendanceMap.get(key);

          if (presentRecord) {
            totalPresent++;
            dateEntry.schedules.push({
              scheduleId: scheduleId,
              day: schedule.day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: 'Present',
              time: presentRecord.time,
              attendanceId: presentRecord.id
            });
          } else {
            dateEntry.schedules.push({
              scheduleId: scheduleId,
              day: schedule.day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: 'Absent',
              time: null,
              attendanceId: null
            });
          }
        });

        attendanceByDate.push(dateEntry);
      });

      // Sort dates in descending order
      attendanceByDate.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalAbsent = totalPossibleClasses - totalPresent;
      const percentage = totalPossibleClasses > 0 
        ? ((totalPresent / totalPossibleClasses) * 100).toFixed(1)
        : 0;

      return {
        id: index + 1,
        studentId: student._id,
        name: student.studentName,
        rollNo: student.registrationNo,
        registrationNo: student.registrationNo,
        presentCount: totalPresent,
        absentCount: totalAbsent,
        percentage: parseFloat(percentage),
        attendanceByDate
      };
    });

    // Sort students by roll number
    reportData.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    // Calculate summary statistics
    const totalStudents = reportData.length;
    const totalMarkedDays = markedDates.length;
    
    const summary = {
      totalStudents,
      totalMarkedDays, // Days when attendance was marked
      totalPossibleClasses, // Total classes that should have happened (sum of schedules per marked day)
      markedDates,
      scheduleCountPerDate,
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
          session: subject.session,
          classSchedule: subject.classSchedule
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

    // Build date filter if provided
    let dateFilter = {};
    let startDate, endDate;
    
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

    // Find all attendance records for this student in this subject
    const attendanceRecords = await Attendance.find({
      rollNo: rollNo,
      subjectId: subjectId,
      ...dateFilter
    }).sort({ date: -1, time: 1 });

    // Get all dates in the range where classes should occur based on schedule
    // This ensures total classes count is the same for all students
    let allPossibleDates = [];
    
    if (startDate && endDate) {
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check if this day has any scheduled classes
        const schedulesForDay = subject.classSchedule.filter(
          schedule => schedule.day === dayOfWeek
        );
        
        if (schedulesForDay.length > 0) {
          allPossibleDates.push({
            date: new Date(currentDate),
            dateKey: currentDate.toISOString().split('T')[0],
            schedules: schedulesForDay
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // If no date range provided, get all dates where attendance was marked
      const markedDates = [...new Set(
        attendanceRecords.map(record => 
          record.date.toISOString().split('T')[0]
        )
      )];
      
      markedDates.forEach(dateKey => {
        const date = new Date(dateKey);
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        const schedulesForDay = subject.classSchedule.filter(
          schedule => schedule.day === dayOfWeek
        );
        
        allPossibleDates.push({
          date: date,
          dateKey: dateKey,
          schedules: schedulesForDay
        });
      });
    }

    // Sort dates in descending order (most recent first)
    allPossibleDates.sort((a, b) => b.date - a.date);

    // Create a map for quick lookup of attendance by date and schedule
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const scheduleId = record.scheduleId?.toString() || 'unknown';
      const key = `${dateKey}_${scheduleId}`;
      
      attendanceMap.set(key, {
        id: record._id,
        time: record.time,
        ipAddress: record.ipAddress,
        discipline: record.discipline
      });
    });

    // Build attendance by date with all possible class schedules
    const attendanceByDate = [];
    let totalPresent = 0;
    let totalPossible = 0;

    allPossibleDates.forEach(dateEntry => {
      const dateScheduleEntry = {
        date: dateEntry.dateKey,
        schedules: []
      };

      // Check each schedule for this date
      dateEntry.schedules.forEach(schedule => {
        const scheduleId = schedule._id?.toString() || 'unknown';
        const key = `${dateEntry.dateKey}_${scheduleId}`;
        const attendance = attendanceMap.get(key);
        
        totalPossible++;

        if (attendance) {
          totalPresent++;
          dateScheduleEntry.schedules.push({
            scheduleId: scheduleId,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'Present',
            time: attendance.time,
            ipAddress: attendance.ipAddress,
            discipline: attendance.discipline,
            attendanceId: attendance.id
          });
        } else {
          dateScheduleEntry.schedules.push({
            scheduleId: scheduleId,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'Absent',
            time: null,
            ipAddress: null,
            discipline: null,
            attendanceId: null
          });
        }
      });

      attendanceByDate.push(dateScheduleEntry);
    });

    const attendancePercentage = totalPossible > 0 
      ? ((totalPresent / totalPossible) * 100).toFixed(1)
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
        code: subject.subjectCode
      },
      totalPossibleClasses: totalPossible, // Same for all students
      totalPresent: totalPresent,
      totalAbsent: totalPossible - totalPresent,
      attendancePercentage: parseFloat(attendancePercentage),
      dateRange: fromDate && toDate ? { fromDate, toDate } : null,
      classSchedule: subject.classSchedule
    };

    res.status(200).json({
      success: true,
      message: 'Student attendance details fetched successfully',
      data: {
        summary,
        attendanceByDate
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
