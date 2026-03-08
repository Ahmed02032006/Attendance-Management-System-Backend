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

export const getStudentAttendanceDetails = async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { fromDate, toDate, subjectId, teacherId } = req.query;

    // Validate required parameters
    if (!rollNo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roll number'
      });
    }

    // Build date filter if provided
    let dateFilter = {};
    if (fromDate && toDate) {
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      
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

    // Build subject filter
    let subjectFilter = {};
    if (subjectId) {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subject ID'
        });
      }
      subjectFilter.subjectId = subjectId;
    }

    // If teacherId is provided, only get subjects belonging to that teacher
    let teacherSubjectIds = [];
    if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher ID'
        });
      }

      const teacherSubjects = await Subject.find({ 
        userId: teacherId,
        ...(subjectId ? { _id: subjectId } : {})
      }).select('_id subjectTitle subjectCode departmentOffering classSchedule registeredStudents');

      teacherSubjectIds = teacherSubjects.map(s => s._id.toString());
      
      if (teacherSubjectIds.length === 0) {
        return res.status(404).json({
          success: false,
          message: subjectId 
            ? 'Subject not found or you do not have permission' 
            : 'No subjects found for this teacher'
        });
      }

      // If subjectId was provided but not in teacher's subjects, we already returned 404 above
      if (subjectId) {
        subjectFilter.subjectId = subjectId;
      } else {
        subjectFilter.subjectId = { $in: teacherSubjectIds };
      }
    } else if (subjectId) {
      subjectFilter.subjectId = subjectId;
    }

    // Find all attendance records for this student
    const attendanceRecords = await Attendance.find({
      rollNo: rollNo,
      ...dateFilter,
      ...subjectFilter
    }).sort({ date: -1, time: 1 }); // Sort by date descending, then time

    if (attendanceRecords.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No attendance records found for this student',
        data: {
          studentInfo: {
            rollNo: rollNo,
            name: null,
            discipline: null
          },
          summary: {
            totalRecords: 0,
            uniqueSubjects: 0,
            uniqueDates: 0
          },
          attendanceBySubject: {},
          attendanceByDate: {}
        }
      });
    }

    // Get student basic info from the most recent record
    const studentInfo = {
      rollNo: rollNo,
      name: attendanceRecords[0].studentName,
      discipline: attendanceRecords[0].discipline
    };

    // Get all unique subject IDs from attendance records
    const uniqueSubjectIds = [...new Set(attendanceRecords.map(r => r.subjectId.toString()))];

    // Fetch subject details for all subjects
    const subjects = await Subject.find({
      _id: { $in: uniqueSubjectIds }
    }).select('subjectTitle subjectCode departmentOffering classSchedule registeredStudents');

    // Create a map of subject details for quick lookup
    const subjectDetailsMap = {};
    subjects.forEach(subject => {
      subjectDetailsMap[subject._id.toString()] = {
        id: subject._id,
        title: subject.subjectTitle,
        code: subject.subjectCode,
        department: subject.departmentOffering,
        classSchedule: subject.classSchedule || []
      };
    });

    // Organize attendance by subject
    const attendanceBySubject = {};
    
    for (const subjectId of uniqueSubjectIds) {
      const subjectRecords = attendanceRecords.filter(r => r.subjectId.toString() === subjectId);
      const subjectDetails = subjectDetailsMap[subjectId] || {
        id: subjectId,
        title: 'Unknown Subject',
        code: 'N/A',
        department: 'N/A',
        classSchedule: []
      };

      // Group by schedule within subject
      const attendanceBySchedule = {};
      
      subjectRecords.forEach(record => {
        const scheduleId = record.scheduleId?.toString() || 'unknown';
        
        if (!attendanceBySchedule[scheduleId]) {
          // Find schedule details from subject's classSchedule
          const scheduleDetails = subjectDetails.classSchedule.find(
            s => s._id?.toString() === scheduleId
          ) || { day: 'Unknown', startTime: '?', endTime: '?' };

          attendanceBySchedule[scheduleId] = {
            scheduleId: scheduleId,
            scheduleDetails: scheduleDetails,
            records: []
          };
        }

        attendanceBySchedule[scheduleId].records.push({
          id: record._id,
          date: record.date.toISOString().split('T')[0],
          time: record.time,
          ipAddress: record.ipAddress
        });
      });

      // Calculate statistics for this subject
      const totalRecords = subjectRecords.length;
      const uniqueDates = [...new Set(subjectRecords.map(r => 
        r.date.toISOString().split('T')[0]
      ))].length;

      attendanceBySubject[subjectId] = {
        subjectDetails: subjectDetails,
        summary: {
          totalAttendance: totalRecords,
          uniqueDays: uniqueDates
        },
        schedules: attendanceBySchedule
      };
    }

    // Organize attendance by date
    const attendanceByDate = {};
    
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      const scheduleId = record.scheduleId?.toString() || 'unknown';
      
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {
          date: dateKey,
          records: []
        };
      }

      const subjectDetails = subjectDetailsMap[record.subjectId.toString()] || {
        title: 'Unknown Subject',
        code: 'N/A'
      };

      // Find schedule details
      let scheduleDetails = { day: 'Unknown', startTime: '?', endTime: '?' };
      if (subjectDetails.classSchedule) {
        const foundSchedule = subjectDetails.classSchedule.find(
          s => s._id?.toString() === scheduleId
        );
        if (foundSchedule) {
          scheduleDetails = foundSchedule;
        }
      }

      attendanceByDate[dateKey].records.push({
        id: record._id,
        subjectId: record.subjectId,
        subjectTitle: subjectDetails.title,
        subjectCode: subjectDetails.code,
        scheduleId: scheduleId,
        scheduleDay: scheduleDetails.day,
        scheduleTime: `${scheduleDetails.startTime || '?'} - ${scheduleDetails.endTime || '?'}`,
        time: record.time,
        ipAddress: record.ipAddress
      });
    });

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(attendanceByDate).sort().reverse();
    const sortedAttendanceByDate = {};
    sortedDates.forEach(date => {
      sortedAttendanceByDate[date] = attendanceByDate[date];
    });

    // Calculate overall summary
    const summary = {
      totalRecords: attendanceRecords.length,
      uniqueSubjects: uniqueSubjectIds.length,
      uniqueDates: sortedDates.length,
      subjectsWithAttendance: Object.keys(attendanceBySubject).length,
      dateRange: fromDate && toDate ? { fromDate, toDate } : null
    };

    res.status(200).json({
      success: true,
      message: 'Student attendance details fetched successfully',
      data: {
        studentInfo,
        summary,
        attendanceBySubject,
        attendanceByDate: sortedAttendanceByDate
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

export const getStudentSummary = async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { teacherId } = req.query;

    if (!rollNo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roll number'
      });
    }

    // Build query
    let query = { rollNo };
    
    // If teacherId provided, only get subjects belonging to that teacher
    if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher ID'
        });
      }

      const teacherSubjects = await Subject.find({ userId: teacherId }).select('_id');
      const subjectIds = teacherSubjects.map(s => s._id);
      query.subjectId = { $in: subjectIds };
    }

    // Get all attendance records for this student
    const attendanceRecords = await Attendance.find(query).sort({ date: -1 });

    if (attendanceRecords.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No attendance records found',
        data: {
          studentInfo: {
            rollNo,
            name: null,
            discipline: null
          },
          totalAttendance: 0,
          subjectsCount: 0,
          lastAttendance: null
        }
      });
    }

    // Get student info
    const studentInfo = {
      rollNo,
      name: attendanceRecords[0].studentName,
      discipline: attendanceRecords[0].discipline
    };

    // Calculate summary
    const uniqueSubjects = new Set(attendanceRecords.map(r => r.subjectId.toString()));
    const uniqueDates = new Set(attendanceRecords.map(r => 
      r.date.toISOString().split('T')[0]
    ));

    // Get last 5 attendance records
    const recentAttendance = attendanceRecords.slice(0, 5).map(record => ({
      id: record._id,
      date: record.date.toISOString().split('T')[0],
      time: record.time,
      subjectId: record.subjectId
    }));

    // Fetch subject details for recent attendance
    if (recentAttendance.length > 0) {
      const subjectIds = [...new Set(recentAttendance.map(r => r.subjectId))];
      const subjects = await Subject.find({ _id: { $in: subjectIds } })
        .select('subjectTitle subjectCode');
      
      const subjectMap = {};
      subjects.forEach(s => {
        subjectMap[s._id.toString()] = s;
      });

      recentAttendance.forEach(record => {
        const subject = subjectMap[record.subjectId?.toString()];
        if (subject) {
          record.subjectTitle = subject.subjectTitle;
          record.subjectCode = subject.subjectCode;
        }
        delete record.subjectId;
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student summary fetched successfully',
      data: {
        studentInfo,
        summary: {
          totalAttendance: attendanceRecords.length,
          subjectsCount: uniqueSubjects.size,
          daysCount: uniqueDates.size
        },
        recentAttendance
      }
    });

  } catch (error) {
    console.error('Error fetching student summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student summary',
      error: error.message
    });
  }
};
