import User from '../../Models/userModel.js';
import Subject from '../../Models/subjectModel.js';
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
    // Get all users without any filters or queries
    const users = await User.find()
      .select('userPassword') // Include password in response
      .sort({ createdAt: -1 });

    // For each user, count subjects if they are teachers and decode password
    const usersWithSubjectCount = await Promise.all(
      users.map(async (user) => {
        // Convert user to plain object
        const userObject = user.toObject();
        
        // Only count subjects for teachers
        if (user.userRole === 'Teacher') {
          const subjectCount = await Subject.countDocuments({ userId: user._id });
          userObject.subjectCount = subjectCount;
        } else {
          userObject.subjectCount = 0;
        }
        
        // Decode password (assuming it's base64 encoded)
        if (userObject.userPassword) {
          try {
            // Decode from base64
            userObject.decodedPassword = Buffer.from(userObject.userPassword, 'base64').toString('utf8');
          } catch (error) {
            // If decoding fails, show the encoded password
            userObject.decodedPassword = 'Unable to decode password';
            console.error('Error decoding password for user:', user.userEmail, error);
          }
        }
        
        return userObject;
      })
    );

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
