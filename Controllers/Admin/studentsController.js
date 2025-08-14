import Student from "../../Models/studentModel.js";

// Create Student
export const createStudent = async (req, res) => {
  try {
    const newStudent = await Student.create(req.body);
    res.status(201).json({
      success: true,
      status: "Success",
      message: "Student created successfully",
      data: newStudent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get All Students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).populate("classId").populate("schoolId");
    res.status(200).json({
      success: true,
      status: "Success",
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get Students By School ID
export const getStudentsBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const students = await Student.find({ schoolId }).sort({ createdAt: -1 }).populate("classId");
    res.status(200).json({
      success: true,
      status: "Success",
      data: students,
      studentId: students._id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get Single Student by ID
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId").populate("schoolId");

    if (!student) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Update Student
export const updateStudent = async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Delete Student
export const deleteStudent = async (req, res) => {
  try {
    const deleted = await Student.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};


