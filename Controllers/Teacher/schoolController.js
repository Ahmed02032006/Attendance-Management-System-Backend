import School from "../../Models/schoolModel.js";
import Teacher from "../../Models/teacherModel.js";

const getSchoolsByTeacherId = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        status: "Error", 
        message: "Teacher ID parameter is required" 
      });
    }

    const teacher = await Teacher.findById(id);
    
    if (!teacher) {
      return res.status(404).json({ 
        status: "Error", 
        message: "Teacher not found" 
      });
    }

    const school = await School.findById(teacher.schoolId);
    
    if (!school) {
      return res.status(404).json({ 
        status: "Error", 
        message: "School not found for this teacher" 
      });
    }

    return res.status(200).json({
      status: "Success",
      data: school,
    });
  } catch (error) {
    return res.status(500).json({ 
      status: "Error", 
      message: error.message 
    });
  }
};

export { getSchoolsByTeacherId };