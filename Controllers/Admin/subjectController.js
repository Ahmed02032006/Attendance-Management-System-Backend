import Subject from "../../Models/subjectModel.js";

// Create a new subject
export const createSubject = async (req, res) => {
  try {
    const subject = new Subject(req.body);
    const savedSubject = await subject.save();

    const populatedSubject = await Subject.findById(savedSubject._id)
      .populate("teachers")
      .populate("classes");

    res.status(201).json({
      success: true,
      status: "Success",
      message: "Subject created",
      data: populatedSubject,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get all subjects for a specific school
export const getAllSubjects = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const subjects = await Subject.find({ schoolId }).populate("teachers").populate('classes').sort({ createdAt: -1 });

    res.status(200).json({ success: true, status: "Success", data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, status: "Error", message: error.message });
  }
};

// Get subject by ID
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, status: "Error", message: "Subject not found" });
    }
    res.status(200).json({ success: true, status: "Success", data: subject });
  } catch (error) {
    res.status(500).json({ success: false, status: "Error", message: error.message });
  }
};

// Update subject
export const updateSubject = async (req, res) => {
  try {
    const updatedSubject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate("teachers").populate('classes');

    if (!updatedSubject) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Subject not found"
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Subject updated",
      data: updatedSubject
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      status: "Error",
      message: error.message
    });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    const deletedSubject = await Subject.findByIdAndDelete(req.params.id);
    if (!deletedSubject) {
      return res.status(404).json({ status: "Error", message: "Subject not found" });
    }
    res.status(200).json({ success: true, status: "Success", message: "Subject deleted", data: deletedSubject });
  } catch (error) {
    res.status(500).json({ success: false, status: "Error", message: error.message });
  }
};
