import Admission from "../../Models/admissionModel.js";

// Create new application
const createApplication = async (req, res) => {
  try {
    const newApp = await Admission.create(req.body);

    res.status(201).json({
      success: true,
      status: "Success",
      message: "Application created successfully",
      data: newApp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get all applications for a specific school
const getAllApplications = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const applications = await Admission.find({ schoolId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      status: "Success",
      data: applications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get single application by ID
const getApplicationById = async (req, res) => {
  try {
    const application = await Admission.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      data: application,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Update application
const updateApplication = async (req, res) => {
  try {
    const updatedApp = await Admission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedApp) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Application updated successfully",
      data: updatedApp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Delete application
const deleteApplication = async (req, res) => {
  try {
    const deleted = await Admission.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Application deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Update the status of an application and all its documents
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Invalid status value. Must be 'Pending', 'Approved', or 'Rejected'",
      });
    }

    // Find the application first
    const admission = await Admission.findById(id);
    if (!admission) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Application not found",
      });
    }

    // Update main application status
    admission.status = status;

    // Set ALL document statuses to the same status (Approved or Rejected)
    admission.documents = admission.documents.map((doc) => ({
      ...doc.toObject(),
      status, // override regardless of previous state
    }));

    const updatedApp = await admission.save();

    res.status(200).json({
      success: true,
      status: "Success",
      message: `Application and all documents updated to ${status}`,
      data: updatedApp,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

export { createApplication , getAllApplications , getApplicationById , updateApplication , deleteApplication , updateApplicationStatus }
