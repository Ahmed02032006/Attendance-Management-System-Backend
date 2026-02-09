import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    userName: {
        type: String,
        required: [true, "Please enter your name"],
    },
    userEmail: {
        type: String,
        required: [true, "Please enter your email"],
        unique: true,
    },
    userPassword: {
        type: String,
        required: [true, "Please enter your password"],
    },
    userRole: {
        type: String,
        default: "Admin",
        required: true,
    },
    profilePicture: {
        type: String,
        required: [false, "Please enter your profile picture"],
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },      
    status: {
        type: String,
        default: "Active",
        required: true,
    },
}, { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
