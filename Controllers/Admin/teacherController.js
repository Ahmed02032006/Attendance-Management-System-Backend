import User from "../../Models/userModel.js";
import Teacher from "../../Models/teacherModel.js";

const createTeacher = async (req, res) => {
  try {
    const {
      teacherId,
      teacherName,
      teacherEmail,
      teacherPassword,
      teacherGender,
      salary,
      experienceYears,
      schoolId,
      teacherProfilePicture,
      department,
      contact,
      qualification,
      status
    } = req.body;

    if (!teacherId || !teacherName || !teacherEmail || !teacherPassword || !teacherGender || !experienceYears || !salary || !schoolId || !teacherProfilePicture || !department || !contact || !qualification || !status) {
      return res
        .status(400)
        .json({ status: "Error", message: "Please provide all required fields" });
    }

    const userAvailability = await User.findOne({ teacherEmail });

    if (userAvailability) {
      return res
        .status(400)
        .json({ status: "Error", message: "Email already exists" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(teacherEmail)) {
      return res
        .status(400)
        .json({ status: "Error", message: "Invalid email format" });
    }

    const teacher = await Teacher.create({
      teacherId: teacherId,
      teacherName: teacherName,
      teacherEmail: teacherEmail,
      teacherPassword: teacherPassword,
      teacherProfilePicture,
      teacherGender,
      salary,
      experienceYears,
      schoolId,
      department,
      contact,
      qualification,
      status: "Active",
    });

    if (!teacher) {
      res.status(400).json({
        status: "Error",
        message: "Something went wrong while creating teacher",
      });
    }

    return res
      .status(201)
      .json({ status: "Success", message: "Teacher Created successfully" });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const getTeacherBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;

    if (!schoolId) {
      return res.status(400).json({
        status: "Error",
        message: "School ID is required",
      });
    }

    const teachers = await Teacher.find({
      schoolId: schoolId,
    }).populate(
      "schoolId",
      "schoolName establishedYear phone address city state country about website schoolLogo noOfStudent noOfTeacher"
    );

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({
        status: "Error",
        message: "No teachers found in this school",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Teachers fetched successfully",
      data: teachers, // Returns an array of teachers
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const markAttendance = async (req, res) => {
  try {
    const { teacherId, date, status, checkIn, checkOut, leaveRequest, reason, leaveType, lateReason } = req.body;

    if (!teacherId || !date || !status || !checkIn || !checkOut) {
      return res.status(400).json({
        status: "Error",
        message: "Please provide teacherId, date, status, checkIn and checkOut",
      });
    }

    // Validate status
    if (!["present", "absent", "late"].includes(status)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid status. Must be present, absent, or late",
      });
    }

    // Check if attendance already exists for this date
    const teacher = await Teacher.findOne({
      _id: teacherId,
      "attendance.date": date
    });

    if (teacher) {
      return res.status(400).json({
        status: "Error",
        message: "Attendance already marked for this date",
      });
    }

    const attendanceRecord = {
      date,
      status,
      checkIn,
      checkOut,
      leaveRequest: leaveRequest || false,
      reason,
      leaveType,
      lateReason
    };

    // Add attendance record
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $push: { attendance: attendanceRecord } },
      { new: true }
    );

    return res.status(201).json({
      status: "Success",
      message: "Attendance marked successfully",
      data: updatedTeacher.attendance,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const createLeaveRequest = async (req, res) => {
  try {
    const { teacherId, date, reason, type, notes } = req.body;

    if (!teacherId || !date || !reason || !type) {
      return res.status(400).json({
        status: "Error",
        message: "Please provide teacherId, date, reason and type",
      });
    }

    // Validate leave type
    if (!["sick", "personal", "casual"].includes(type)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid leave type. Must be sick, personal, or casual",
      });
    }

    const leaveRequest = {
      date,
      reason,
      type,
      notes: notes || "",
      status: "pending"
    };

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $push: { leaveRequests: leaveRequest } },
      { new: true }
    );

    return res.status(201).json({
      status: "Success",
      message: "Leave request created successfully",
      data: updatedTeacher.leaveRequests,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { teacherId, requestId } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid status. Must be pending, approved, or rejected",
      });
    }

    const teacher = await Teacher.findOneAndUpdate(
      {
        _id: teacherId,
        "leaveRequests._id": requestId
      },
      {
        $set: {
          "leaveRequests.$.status": status,
          "leaveRequests.$.updatedAt": new Date()
        }
      },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({
        status: "Error",
        message: "Teacher or leave request not found",
      });
    }

    // Find the updated leave request
    const updatedRequest = teacher.leaveRequests.find(
      req => req._id.toString() === requestId
    );

    return res.status(200).json({
      status: "Success",
      message: "Leave request status updated successfully",
      data: updatedRequest,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const getTeacherCountBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;

    if (!schoolId) {
      return res.status(400).json({
        status: "Error",
        message: "School ID is required",
      });
    }

    const teacherCount = await Teacher.countDocuments({
      schoolId: schoolId,
      status: "Active"
    });

    return res.status(200).json({
      status: "Success",
      message: "Teacher count fetched successfully",
      data: {
        schoolId: schoolId,
        teacherCount: teacherCount
      }
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTeacher = await Teacher.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedTeacher) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

const changeTeacherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Active", "Inactive", "Suspended", "On Leave"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Invalid status value",
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Teacher status updated",
      data: updatedTeacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

export { changeTeacherStatus, updateTeacher, createTeacher, getTeacherBySchoolId, markAttendance, createLeaveRequest, updateLeaveRequestStatus, getTeacherCountBySchoolId };
