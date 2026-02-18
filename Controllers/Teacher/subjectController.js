import Subject from '../../Models/subjectModel.js';
import Attendance from '../../Models/attendanceModel.js';
import mongoose from 'mongoose';

export const createSubject = async (req, res) => {
  try {
    const {
      subjectTitle,
      departmentOffering,  // Changed from subjectName
      subjectCode,
      creditHours,         // New field
      session,            // New field
      status,
      semester,
      userId
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
      departmentOffering,  // Changed from subjectName
      subjectCode,
      creditHours,         // New field
      session,            // New field
      status: status || 'Active',
      semester,
      userId,
      createdDate: new Date()
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
          department: subject.departmentOffering,  // Changed from subjectName
          code: subject.subjectCode,
          creditHours: subject.creditHours,        // New field
          session: subject.session,                // New field
          semester: subject.semester,
          students: studentCount.length,
          status: subject.status,
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

export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subjectTitle,
      departmentOffering,  // Changed from subjectName
      subjectCode,
      creditHours,         // New field
      session,            // New field
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

    // Update subject
    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        subjectTitle,
        departmentOffering,  // Changed from subjectName
        subjectCode,
        creditHours,         // New field
        session,            // New field
        status,
        semester
      },
      { new: true, runValidators: true }
    ).populate('userId', 'userName userEmail');

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
          subjectName: subject.subjectName,
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
        subjectName: subject.subjectName,
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