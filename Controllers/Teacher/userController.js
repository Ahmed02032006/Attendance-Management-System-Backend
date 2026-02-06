import User from '../../Models/userModel.js';
import mongoose from 'mongoose';

// Update User
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            userName,
            userEmail,
            profilePicture,
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Check if user exists
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is being changed and if it already exists
        if (userEmail && userEmail !== existingUser.userEmail) {
            const userWithSameEmail = await User.findOne({
                userEmail,
                _id: { $ne: id }
            });
            if (userWithSameEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Prepare update data
        const updateData = {
            userName,
            userEmail,
            profilePicture,
        };

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};