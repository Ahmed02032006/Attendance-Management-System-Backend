import School from "../../Models/schoolModel.js";

const getAllSchools = async (req, res) => {
  try {
    const schools = await School.find().populate("createdBy", "userName userEmail userRole");

    return res.status(200).json({
      status: "Success",
      count: schools.length,
      data: schools,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const updateSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedSchool) {
      return res.status(404).json({
        status: "Error",
        message: "School not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "School updated successfully",
      data: updatedSchool,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const deleteSchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    const deletedSchool = await School.findByIdAndDelete(schoolId);

    if (!deletedSchool) {
      return res.status(404).json({
        status: "Error",
        message: "School not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "School deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const updateSchoolVerificationStatus = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { verificationStatus } = req.body;

    if (!schoolId) {
      return res.status(400).json({
        status: "Error",
        message: "School ID is required",
      });
    }

    if (!['Pending', 'Verified', 'Rejected'].includes(verificationStatus)) {
      return res.status(400).json({
        status: "Error",
        message: "Invalid verification status. Must be 'Pending', 'Verified', or 'Rejected'",
      });
    }

    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { verificationStatus },
      { new: true, runValidators: true }
    );

    if (!updatedSchool) {
      return res.status(404).json({
        status: "Error",
        message: "School not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "School verification status updated successfully",
      data: updatedSchool,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

export { getAllSchools , updateSchool, deleteSchool , updateSchoolVerificationStatus }
