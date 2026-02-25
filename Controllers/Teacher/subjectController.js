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

// Create new subject
export const createSubject = async (req, res) => {
  try {
    const {
      subjectTitle,
      departmentOffering,
      subjectCode,
      creditHours,
      session,
      status,
      semester,
      userId,
      registeredStudents // New field
    } = req.body;

    // Validate credit hours
    if (creditHours && (creditHours < 1 || creditHours > 6)) {
      return res.status(400).json({
        success: false,
        message: 'Credit hours must be between 1 and 6'
      });
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ subjectCode });
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Subject code already exists'
      });
    }

    // Create new subject
    const subject = new Subject({
      subjectTitle,
      departmentOffering,
      subjectCode,
      creditHours,
      session,
      status: status || 'Active',
      semester,
      userId,
      createdDate: new Date(),
      registeredStudents: registeredStudents || [] // Initialize with provided students or empty array
    });

    const savedSubject = await subject.save();

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: savedSubject
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subject',
      error: error.message
    });
  }
};

// Get subjects by user
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

    // Format subjects with new fields
    const formattedSubjects = await Promise.all(
      subjects.map(async (subject, index) => {
        // Get unique student count for this subject
        const studentCount = await Attendance.distinct('rollNo', {
          subjectId: subject._id
        });

        return {
          id: subject._id.toString(),
          title: subject.subjectTitle,
          departmentOffering: subject.departmentOffering,
          code: subject.subjectCode,
          creditHours: subject.creditHours,
          session: subject.session,
          semester: subject.semester,
          students: studentCount.length,
          registeredStudentsCount: subject.registeredStudents?.length || 0, // Count of registered students
          status: subject.status,
          createdAt: subject.createdDate,
          color: subjectColors[index % subjectColors.length]
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

// Get registered students by subject ID
export const getRegisteredStudentsBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { teacherId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    }).select('registeredStudents subjectTitle subjectCode semester session');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to view it'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registered students fetched successfully',
      data: {
        subjectId: subject._id,
        subjectTitle: subject.subjectTitle,
        subjectCode: subject.subjectCode,
        semester: subject.semester,
        session: subject.session,
        registeredStudents: subject.registeredStudents || []
      }
    });
  } catch (error) {
    console.error('Error fetching registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registered students',
      error: error.message
    });
  }
};

// Add registered students to a subject
export const addRegisteredStudents = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { teacherId, students } = req.body; // students should be array of {registrationNo, studentName}

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of students'
      });
    }

    // Validate each student object
    for (const student of students) {
      if (!student.registrationNo || !student.studentName) {
        return res.status(400).json({
          success: false,
          message: 'Each student must have registrationNo and studentName'
        });
      }
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to modify it'
      });
    }

    // Check for duplicate registration numbers within the new students
    const registrationNos = students.map(s => s.registrationNo);
    const uniqueRegistrationNos = [...new Set(registrationNos)];
    if (uniqueRegistrationNos.length !== students.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate registration numbers found in the import list'
      });
    }

    // Check for existing registration numbers in the subject
    const existingRegNos = new Set(subject.registeredStudents.map(s => s.registrationNo));

    // Filter out students that already exist
    const newStudents = students.filter(s => !existingRegNos.has(s.registrationNo));
    const duplicateStudents = students.filter(s => existingRegNos.has(s.registrationNo));

    if (newStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All students already exist in this subject',
        duplicates: duplicateStudents
      });
    }

    // Add only new students to the registeredStudents array
    if (newStudents.length > 0) {
      subject.registeredStudents.push(...newStudents);
      await subject.save();
    }

    res.status(200).json({
      success: true,
      message: `${newStudents.length} students added successfully${duplicateStudents.length > 0 ? `. ${duplicateStudents.length} students were skipped as they already exist.` : ''}`,
      data: {
        subjectId: subject._id,
        addedCount: newStudents.length,
        skippedCount: duplicateStudents.length,
        skippedStudents: duplicateStudents,
        totalRegisteredStudents: subject.registeredStudents.length
      }
    });
  } catch (error) {
    console.error('Error adding registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding registered students',
      error: error.message
    });
  }
};

// Update a registered student
export const updateRegisteredStudent = async (req, res) => {
  try {
    const { subjectId, studentId } = req.params;
    const { teacherId, registrationNo, studentName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID or student ID'
      });
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to modify it'
      });
    }

    // Find the student in the registeredStudents array
    const studentIndex = subject.registeredStudents.findIndex(
      s => s._id.toString() === studentId
    );

    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if registration number is being changed and if it already exists
    if (registrationNo && registrationNo !== subject.registeredStudents[studentIndex].registrationNo) {
      const existingStudent = subject.registeredStudents.find(
        s => s.registrationNo === registrationNo && s._id.toString() !== studentId
      );

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Registration number already exists in this subject'
        });
      }
    }

    // Update student details
    if (registrationNo) subject.registeredStudents[studentIndex].registrationNo = registrationNo;
    if (studentName) subject.registeredStudents[studentIndex].studentName = studentName;

    await subject.save();

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: subject.registeredStudents[studentIndex]
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
};

// Delete a registered student
export const deleteRegisteredStudent = async (req, res) => {
  try {
    const { subjectId, studentId } = req.params;
    const { teacherId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID or student ID'
      });
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to modify it'
      });
    }

    // Remove the student from registeredStudents array
    const initialLength = subject.registeredStudents.length;
    subject.registeredStudents = subject.registeredStudents.filter(
      s => s._id.toString() !== studentId
    );

    if (initialLength === subject.registeredStudents.length) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await subject.save();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: {
        subjectId: subject._id,
        remainingStudents: subject.registeredStudents.length
      }
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
};

// Existing functions (keep as they are)
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subjectTitle,
      departmentOffering,
      subjectCode,
      creditHours,
      session,
      status,
      semester
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Validate credit hours if provided
    if (creditHours && (creditHours < 1 || creditHours > 6)) {
      return res.status(400).json({
        success: false,
        message: 'Credit hours must be between 1 and 6'
      });
    }

    // Check if subject exists
    const existingSubject = await Subject.findById(id);
    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if subject code is being changed and if it already exists
    if (subjectCode && subjectCode !== existingSubject.subjectCode) {
      const subjectWithSameCode = await Subject.findOne({
        subjectCode,
        _id: { $ne: id }
      });
      if (subjectWithSameCode) {
        return res.status(400).json({
          success: false,
          message: 'Subject code already exists'
        });
      }
    }

    // Update subject (excluding registeredStudents)
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        subjectTitle,
        departmentOffering,
        subjectCode,
        creditHours,
        session,
        status,
        semester
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subject',
      error: error.message
    });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    const subject = await Subject.findByIdAndDelete(id);

    // Delete all attendance records for this subject
    await Attendance.deleteMany({ subjectId: id });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully',
      data: subject
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subject',
      error: error.message
    });
  }
};

export const resetSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate subject ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Check if subject exists
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Delete all attendance records for this subject
    const deleteResult = await Attendance.deleteMany({ subjectId: id });

    // Check if any records were deleted
    if (deleteResult.deletedCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No attendance records found for this subject. Nothing to reset.',
        data: {
          subjectId: id,
          subjectTitle: subject.subjectTitle,
          departmentOffering: subject.departmentOffering,
          deletedAttendanceCount: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Subject attendance records cleared successfully. ${deleteResult.deletedCount} attendance records deleted.`,
      data: {
        subjectId: id,
        subjectTitle: subject.subjectTitle,
        departmentOffering: subject.departmentOffering,
        deletedAttendanceCount: deleteResult.deletedCount
      }
    });
  } catch (error) {
    console.error('Error resetting subject attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting subject attendance',
      error: error.message
    });
  }
};

// Delete all registered students from a subject
export const deleteAllRegisteredStudents = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { teacherId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
      });
    }

    // Find the subject and verify it belongs to the teacher
    const subject = await Subject.findOne({
      _id: subjectId,
      userId: teacherId
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found or you do not have permission to modify it'
      });
    }

    // Check if there are any students to delete
    if (!subject.registeredStudents || subject.registeredStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No registered students found to delete'
      });
    }

    // Store count before deletion
    const deletedCount = subject.registeredStudents.length;

    // Clear the registeredStudents array
    subject.registeredStudents = [];
    await subject.save();

    res.status(200).json({
      success: true,
      message: `${deletedCount} students deleted successfully`,
      data: {
        subjectId: subject._id,
        deletedCount: deletedCount,
        remainingStudents: 0
      }
    });
  } catch (error) {
    console.error('Error deleting all registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting all registered students',
      error: error.message
    });
  }
};
