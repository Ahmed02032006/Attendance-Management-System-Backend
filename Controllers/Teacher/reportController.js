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
          classSchedule: subject.classSchedule || [],
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
    }).sort({ date: 1, time: 1 });

    // Generate all dates in the range
    const allDatesInRange = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      allDatesInRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get class schedules
    const classSchedules = subject.classSchedule || [];

    // Create a map for quick lookup of attendance by rollNo, date, and scheduleId
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const scheduleKey = record.scheduleId?.toString() || 'unknown';
      const key = `${record.rollNo}_${dateKey}_${scheduleKey}`;
      attendanceMap.set(key, {
        id: record._id,
        studentName: record.studentName,
        rollNo: record.rollNo,
        discipline: record.discipline,
        time: record.time,
        date: dateKey,
        scheduleId: record.scheduleId,
        status: 'Present'
      });
    });

    // Build the report data for each student
    const reportData = registeredStudents.map((student, index) => {
      // Initialize attendance array for all dates and schedules
      const attendanceByDate = [];

      allDatesInRange.forEach(date => {
        // For each date, check all class schedules
        const schedulesForDate = classSchedules.map(schedule => {
          const scheduleId = schedule._id?.toString() || 'unknown';
          const key = `${student.registrationNo}_${date}_${scheduleId}`;
          const presentRecord = attendanceMap.get(key);
          
          if (presentRecord) {
            return {
              scheduleId: scheduleId,
              day: schedule.day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: 'Present',
              time: presentRecord.time,
              discipline: presentRecord.discipline,
              attendanceId: presentRecord.id
            };
          } else {
            return {
              scheduleId: scheduleId,
              day: schedule.day,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              status: 'Absent',
              time: null,
              discipline: null,
              attendanceId: null
            };
          }
        });

        attendanceByDate.push({
          date: date,
          schedules: schedulesForDate
        });
      });

      // Calculate present and absent counts based on schedules
      let totalPresentCount = 0;
      let totalPossibleCount = 0;
      
      attendanceByDate.forEach(dayEntry => {
        dayEntry.schedules.forEach(schedule => {
          totalPossibleCount++;
          if (schedule.status === 'Present') {
            totalPresentCount++;
          }
        });
      });

      const totalAbsentCount = totalPossibleCount - totalPresentCount;
      const percentage = totalPossibleCount > 0 
        ? ((totalPresentCount / totalPossibleCount) * 100).toFixed(1)
        : 0;

      return {
        id: index + 1,
        studentId: student._id,
        name: student.studentName,
        rollNo: student.registrationNo,
        registrationNo: student.registrationNo,
        presentCount: totalPresentCount,
        absentCount: totalAbsentCount,
        totalPossibleClasses: totalPossibleCount,
        percentage: parseFloat(percentage),
        attendance: attendanceByDate
      };
    });

    // Sort students by roll number (alphanumeric sort)
    reportData.sort((a, b) => 
      a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
    );

    // Calculate total possible classes for the date range
    const totalPossibleClasses = allDatesInRange.length * classSchedules.length;

    // Calculate summary statistics
    const totalStudents = reportData.length;
    const totalDays = allDatesInRange.length;
    
    // Calculate total present count across all students
    const totalPresentAcrossAllStudents = reportData.reduce((sum, student) => sum + student.presentCount, 0);
    const averageAttendance = totalStudents > 0 && totalPossibleClasses > 0
      ? ((totalPresentAcrossAllStudents / (totalStudents * totalPossibleClasses)) * 100).toFixed(1)
      : 0;

    const summary = {
      totalStudents,
      totalDays,
      totalSchedules: classSchedules.length,
      totalPossibleClasses,
      totalPresentClasses: totalPresentAcrossAllStudents,
      totalAbsentClasses: (totalStudents * totalPossibleClasses) - totalPresentAcrossAllStudents,
      dates: allDatesInRange,
      classSchedules: classSchedules.map(s => ({
        id: s._id,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime
      })),
      averageAttendance: parseFloat(averageAttendance),
      studentsAbove75: reportData.filter(s => s.percentage >= 75).length,
      studentsBetween50And75: reportData.filter(s => s.percentage >= 50 && s.percentage < 75).length,
      studentsBetween25And50: reportData.filter(s => s.percentage >= 25 && s.percentage < 50).length,
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
      .select('classSchedule registeredStudents');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if student is registered in this subject
    const isRegistered = subject.registeredStudents?.some(
      student => student.registrationNo === rollNo
    );

    if (!isRegistered) {
      return res.status(404).json({
        success: false,
        message: 'Student is not registered in this subject'
      });
    }

    // Determine date range
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
    } else {
      // If no date range provided, get the earliest and latest attendance dates for this subject
      const dateRange = await Attendance.aggregate([
        {
          $match: {
            subjectId: new mongoose.Types.ObjectId(subjectId)
          }
        },
        {
          $group: {
            _id: null,
            minDate: { $min: "$date" },
            maxDate: { $max: "$date" }
          }
        }
      ]);

      if (dateRange.length > 0) {
        startDate = new Date(dateRange[0].minDate);
        endDate = new Date(dateRange[0].maxDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // If no attendance records at all, return empty response
        return res.status(200).json({
          success: true,
          message: 'No attendance records found for this subject',
          data: {
            summary: {
              totalDates: 0,
              totalSchedules: subject.classSchedule.length,
              totalPresent: 0,
              totalAbsent: 0,
              totalPossible: 0,
              attendancePercentage: 0,
              dateRange: null
            },
            attendanceByDate: []
          }
        });
      }
    }

    // Get all attendance records for this student in this subject within date range
    const attendanceRecords = await Attendance.find({
      rollNo: rollNo,
      subjectId: subjectId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1, time: 1 });

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

    // Generate all dates in the range
    const allDatesInRange = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      allDatesInRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build attendance by date with class schedules for ALL dates in range
    const attendanceByDate = [];

    allDatesInRange.forEach(dateKey => {
      const dateEntry = {
        date: dateKey,
        schedules: []
      };

      // Check each class schedule for this date
      subject.classSchedule.forEach(schedule => {
        const scheduleId = schedule._id?.toString() || 'unknown';
        const key = `${dateKey}_${scheduleId}`;
        const attendance = attendanceMap.get(key);

        if (attendance) {
          // Student marked attendance in this schedule
          dateEntry.schedules.push({
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            status: 'Present',
            time: attendance.time,
            attendanceId: attendance.id
          });
        } else {
          // Student did not mark attendance in this schedule
          dateEntry.schedules.push({
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

    // Sort dates in descending order (most recent first)
    attendanceByDate.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate summary statistics
    const totalSchedules = subject.classSchedule.length;
    const totalPossible = allDatesInRange.length * totalSchedules;
    
    let totalPresent = 0;
    attendanceByDate.forEach(dateEntry => {
      dateEntry.schedules.forEach(schedule => {
        if (schedule.status === 'Present') {
          totalPresent++;
        }
      });
    });

    const attendancePercentage = totalPossible > 0 
      ? ((totalPresent / totalPossible) * 100).toFixed(1)
      : 0;

    const summary = {
      totalDates: allDatesInRange.length,
      totalSchedules: totalSchedules,
      totalPresent: totalPresent,
      totalAbsent: totalPossible - totalPresent,
      totalPossible: totalPossible,
      attendancePercentage: parseFloat(attendancePercentage),
      dateRange: {
        fromDate: startDate.toISOString().split('T')[0],
        toDate: endDate.toISOString().split('T')[0]
      }
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
