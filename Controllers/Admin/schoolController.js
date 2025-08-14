import School from "../../Models/schoolModel.js";

const getSchoolsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    const schools = await School.find({ createdBy: userId }).populate("createdBy", "userName userEmail userRole");

    return res.status(200).json({
      status: "Success",
      count: schools.length,
      data: schools,
    });
  } catch (error) {
    return res.status(500).json({ status: "Error", message: error.message });
  }
};

const getSchoolById = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    const school = await School.findById(schoolId).populate("createdBy", "userName userEmail userRole");

    if (!school) {
      return res.status(404).json({
        status: "Error",
        message: "School not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      data: school,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
};

const createSchool = async (req, res) => {
  try {
    const {
      schoolName,
      establishedYear,
      phone,
      address,
      city,
      state,
      country,
      about,
      website,
      schoolLogo,
      noOfStudent,
      noOfTeacher,
      userId
    } = req.body;

    // Only check required fields that don't have defaults
    if (
      !schoolName ||
      !establishedYear ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !country ||
      !about ||
      !website ||
      !schoolLogo ||
      !userId
    ) {
      return res.status(400).json({
        status: "Error",
        message: "Please provide all required fields",
      });
    }

    const school = await School.create({
      schoolLogo,
      schoolName,
      establishedYear,
      phone,
      address,
      city,
      state,
      country,
      about,
      website,
      noOfStudent: noOfStudent || "0",
      noOfTeacher: noOfTeacher || "0",
      verificationStatus: "Pending",
      createdBy: userId,
    });

    return res.status(201).json({
      status: "Success",
      message: "School created successfully",
      data: school,
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

const updateTeacherCount = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { noOfTeacher } = req.body;

    // Validate input
    if (!noOfTeacher || isNaN(noOfTeacher)) {
      return res.status(400).json({
        status: "Error",
        message: "Please provide a valid number of teachers",
      });
    }

    // Find the school and update teacher count
    const updatedSchool = await School.findByIdAndUpdate(
      schoolId,
      { noOfTeacher },
      { new: true, runValidators: true }
    ).populate("createdBy", "userName userEmail userRole");

    if (!updatedSchool) {
      return res.status(404).json({
        status: "Error",
        message: "School not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Teacher count updated successfully",
      data: updatedSchool,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Error",
      message: error.message,
    });
  }
};

export { getSchoolsByUser, createSchool , getSchoolById , updateTeacherCount }
