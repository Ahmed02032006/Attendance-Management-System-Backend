import User from '../../Models/userModel.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Create User (Teacher/Admin)
export const createUser = async (req, res) => {
  try {
    const {
      userName,
      userEmail,
      userPassword,
      userRole,
      profilePicture,
      status
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ userEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userPassword, salt);

    // Create new user
    const user = new User({
      userName,
      userEmail,
      userPassword: hashedPassword,
      userRole: userRole || 'Admin',
      profilePicture: profilePicture || '',
      status: status || 'Active'
    });

    const savedUser = await user.save();

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.userPassword;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    // Get all users with subject count using aggregation
    const usersWithSubjectCount = await User.aggregate([
      {
        $project: {
          userName: 1,
          userEmail: 1,
          userRole: 1,
          profilePicture: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          // Exclude password
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $lookup: {
          from: 'subjects',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] }
              }
            }
          ],
          as: 'subjects'
        }
      },
      {
        $addFields: {
          // Add subject count for all users (will be 0 for non-teachers)
          subjectCount: { $size: '$subjects' }
        }
      },
      {
        $project: {
          subjects: 0 // Remove the subjects array from final result
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      count: usersWithSubjectCount.length,
      data: usersWithSubjectCount
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Update User
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      userName,
      userEmail,
      userPassword,
      userRole,
      profilePicture,
      status
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
      userRole,
      profilePicture,
      status
    };

    // Hash new password if provided
    if (userPassword) {
      const salt = await bcrypt.genSalt(10);
      updateData.userPassword = await bcrypt.hash(userPassword, salt);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-userPassword');

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

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Optional: Prevent deletion of certain users (e.g., super admin)
    if (user.userEmail === 'admin@system.com') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system administrator'
      });
    }

    // Delete user
    const deletedUser = await User.findByIdAndDelete(id).select('-userPassword');

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
