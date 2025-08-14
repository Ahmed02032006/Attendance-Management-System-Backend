import OtherUsers from "../../Models/otherUsersModel.js";

// Create new other user
const createOtherUser = async (req, res) => {
    try {
        const newUser = await OtherUsers.create(req.body);

        res.status(201).json({
            success: true,
            status: "Success",
            message: "User created successfully",
            data: newUser,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

// Get all other users for a specific school
const getAllOtherUsers = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const users = await OtherUsers.find({ schoolId }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            status: "Success",
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

// Get single other user by ID
const getOtherUserById = async (req, res) => {
    try {
        const user = await OtherUsers.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                status: "Error",
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            status: "Success",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

// Update other user
const updateOtherUser = async (req, res) => {
    try {
        const updatedUser = await OtherUsers.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                status: "Error",
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            status: "Success",
            message: "User updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

// Delete other user
const deleteOtherUser = async (req, res) => {
    try {
        const deleted = await OtherUsers.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                status: "Error",
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            status: "Success",
            message: "User deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

// Update the status of an other user
const updateOtherUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const allowedStatuses = ['Active', 'Inactive'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                status: "Error",
                message: "Invalid status value. Must be 'Active', 'Inactive', or 'Suspended'",
            });
        }

        const updatedUser = await OtherUsers.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                status: "Error",
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            status: "Success",
            message: `User status updated to ${status}`,
            data: updatedUser,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "Error",
            message: error.message,
        });
    }
};

export {
    createOtherUser,
    getAllOtherUsers,
    getOtherUserById,
    updateOtherUser,
    deleteOtherUser,
    updateOtherUserStatus
};