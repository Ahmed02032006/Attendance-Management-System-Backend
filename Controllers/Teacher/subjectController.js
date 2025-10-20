import Subject from '../../Models/subjectModel.js';
import mongoose from 'mongoose';

export const createSubject = async (req, res) => {
  try {
    const {
      subjectTitle,
      subjectName,
      subjectCode,
      status,
      semester,
      userId
    } = req.body;

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
      subjectName,
      subjectCode,
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

    const subjects = await Subject.find({ userId })
      .sort({ createdAt: -1 }) // Sort by latest first
      .populate('userId', 'userName userEmail'); // Populate user details if needed

    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      count: subjects.length,
      data: subjects
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
      subjectName,
      subjectCode,
      status,
      semester
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID'
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
        subjectName,
        subjectCode,
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