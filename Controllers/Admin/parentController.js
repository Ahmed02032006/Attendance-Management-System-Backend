import Parent from "../../Models/parentModel.js";

// Create Parent
export const createParent = async (req, res) => {
  try {
    const { parentEmail, children, ...rest } = req.body;

    // Check if parent with given email already exists
    const existingParent = await Parent.findOne({ parentEmail });

    if (existingParent) {
      // If children are provided, add only new unique children
      if (children) {
        const childrenArray = Array.isArray(children) ? children : [children];
        
        const uniqueNewChildren = childrenArray.filter(
          childId => !existingParent.children.includes(childId)
        );

        if (uniqueNewChildren.length > 0) {
          existingParent.children.push(...uniqueNewChildren);
          await existingParent.save();
        }

        return res.status(200).json({
          success: true,
          status: "Updated",
          message: "Parent already exists. Children updated if new ones were provided.",
          data: existingParent,
        });
      }

      return res.status(200).json({
        success: true,
        status: "Exists",
        message: "Parent already exists with no new children to add.",
        data: existingParent,
      });
    }

    // Else, create new parent
    // Convert children to array if it isn't already
    const childrenArray = children ? 
      (Array.isArray(children) ? children : [children]) : 
      [];

    const newParent = await Parent.create({
      parentEmail,
      children: childrenArray,
      ...rest,
    });

    res.status(201).json({
      success: true,
      status: "Success",
      message: "Parent created successfully",
      data: newParent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get All Parents
export const getAllParents = async (req, res) => {
  try {
    const parents = await Parent.find()
      .populate("children") // populate student info if needed
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      status: "Success",
      data: parents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Get Parents by School ID
export const getParentsBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const parents = await Parent.find({ schoolId })
      .populate("children") // optional
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      status: "Success",
      data: parents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Update Parent
export const updateParent = async (req, res) => {
  try {
    const updatedParent = await Parent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedParent) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Parent not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Parent updated successfully",
      data: updatedParent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Delete Parent
export const deleteParent = async (req, res) => {
  try {
    const deletedParent = await Parent.findByIdAndDelete(req.params.id);

    if (!deletedParent) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Parent not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Parent deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};

// Remove a studentId from parent's children array
export const removeStudentFromParent = async (req, res) => {
  try {
    const { parentId, studentId } = req.body;

    if (!parentId || !studentId) {
      return res.status(400).json({
        success: false,
        status: "Error",
        message: "Both parentId and studentId are required",
      });
    }

    const updatedParent = await Parent.findByIdAndUpdate(
      parentId,
      { $pull: { children: studentId } },
      { new: true }
    );

    if (!updatedParent) {
      return res.status(404).json({
        success: false,
        status: "Error",
        message: "Parent not found",
      });
    }

    res.status(200).json({
      success: true,
      status: "Success",
      message: "Student removed from parent's children array",
      data: updatedParent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "Error",
      message: error.message,
    });
  }
};
