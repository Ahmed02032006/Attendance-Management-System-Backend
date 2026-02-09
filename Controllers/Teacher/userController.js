import User from '../../Models/userModel.js';
import Subject from '../../Models/subjectModel.js';
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

export const updateUserLastLoginById = async (req, res) => {
    try {
        const { userId } = req.params; // Get userId from URL params

        // Validate userId
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update last login time to current time
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                lastLogin: Date.now() // This will update to current timestamp
            },
            {
                new: true, // Return the updated document
                runValidators: true
            }
        ).select('-userPassword'); // Exclude password from response

        // Convert to plain object and add subjectCount if user is a teacher
        const userResponse = updatedUser.toObject();

        if (updatedUser.userRole === 'Teacher') {
            const subjectCount = await Subject.countDocuments({ userId: updatedUser._id });
            userResponse.subjectCount = subjectCount;
        } else {
            userResponse.subjectCount = 0;
        }

        res.status(200).json({
            success: true,
            message: 'Last login updated successfully',
            data: userResponse
        });
    } catch (error) {
        console.error('Error updating last login:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating last login',
            error: error.message
        });
    }
};
