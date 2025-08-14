import Class from "../../Models/classModel.js";
import School from "../../Models/schoolModel.js";
import Teacher from "../../Models/teacherModel.js";
import Student from "../../Models/studentModel.js";

// Create a new class
const createClass = async (req, res) => {
  try {
    const { schoolId, classId, name, roomNo, section } = req.body;

    // Check if school exists
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "School not found"
      });
    }

    // Check if class with same classId exists
    const classIdExists = await Class.findOne({ schoolId, classId });
    if (classIdExists) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Class with this classId already exists in this school"
      });
    }

    // Check if class with same name exists
    const nameExists = await Class.findOne({ schoolId, name, section });
    if (nameExists) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Class with this name already exists in this school"
      });
    }

    // Check if class with same roomNo exists
    const roomNoExists = await Class.findOne({ schoolId, roomNo });
    if (roomNoExists) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Class with this room number already exists in this school"
      });
    }

    // Create the class
    const newClass = await Class.create(req.body);

    return res.status(201).json({
      success: true,
      status: "Success",
      message: "Class created successfully",
      data: newClass
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: "Error",
      message: error.message
    });
  }
};

const getClassesBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const classes = await Class.find({ schoolId })
      .populate("classTeacher")
      .populate("teachers.teacher");

    const classesWithStudentCount = await Promise.all(
      classes.map(async (classDoc) => {
        const studentCount = await Student.countDocuments({
          classId: classDoc._id,
        });

        return {
          ...classDoc.toObject(),
          students: studentCount,
        };
      })
    );

    return res.status(200).json({
      status: "Success",
      count: classesWithStudentCount.length,
      data: classesWithStudentCount,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Get a single class by ID
const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      data: classData,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Update a class
const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const updatedClass = await Class.findByIdAndUpdate(classId, req.body, {
      new: true,
      runValidators: true,
    }).populate("classTeacher");

    if (!updatedClass) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      message: "Class updated successfully",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Delete a class
const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const deletedClass = await Class.findByIdAndDelete(classId);

    if (!deletedClass) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      message: "Class deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Update student count in a class
const updateStudentCount = async (req, res) => {
  try {
    const { classId } = req.params;
    const { students } = req.body;

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { students },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      message: "Student count updated successfully",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Add teacher to class
const addTeacherToClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, subject } = req.body;

    if (!teacherId || !subject) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Teacher ID and subject are required",
      });
    }

    const existingClass = await Class.findById(classId);
    if (!existingClass) {
      return res.status(404).json({ success: false, status: "Error", message: "Class not found" });
    }

    // Check if this teacher already exists in the list
    const alreadyExists = existingClass.teachers.some(t =>
      t.teacher.toString() === teacherId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Teacher already assigned to this class",
      });
    }

    // Add the teacher with subject
    existingClass.teachers.push({ teacher: teacherId, subject });
    await existingClass.save();

    const populatedClass = await Class.findById(classId)
      .populate("teachers.teacher") // populate the actual teacher info
      .populate("classTeacher");

    return res.status(200).json({
      success: true,
      status: "Success",
      message: "Teacher added to class successfully",
      data: populatedClass,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Remove teacher from class
const removeTeacherFromClass = async (req, res) => {
  try {
    const { classId, teacherEmail } = req.params;

    const teacher = await Teacher.findOne({ teacherEmail });
    if (!teacher) {
      return res.status(404).json({ status: "Error", message: "Teacher not found" });
    }

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { $pull: { teachers: { teacher: teacher._id } } },
      { new: true }
    ).populate("teachers.teacher").populate("classTeacher");

    if (!updatedClass) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      message: "Teacher removed from class successfully",
      data: updatedClass,
    });

  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

// Update class status
const updateClassStatus = async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.body;

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { status },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ status: "Error", message: "Class not found" });
    }

    return res.status(200).json({
      status: "Success",
      message: "Class status updated successfully",
      data: updatedClass,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

export { createClass, getClassesBySchool, getClassById, updateClass, deleteClass, updateStudentCount, addTeacherToClass, removeTeacherFromClass, updateClassStatus }
