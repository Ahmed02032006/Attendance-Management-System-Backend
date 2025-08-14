import mongoose from "mongoose";

const otherUsersSchema = new mongoose.Schema(
    {
        UserId: {
            type: String,
            required: [true, "Please enter user Id"],
        },
        name: {
            type: String,
            required: [true, "Please enter name"],
        },
        email: {
            type: String,
            required: [true, "Please enter email"],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Please enter password"],
        },
        gender: {
            type: String,
            required: [true, "Please enter gender"],
        },
        address: {
            type: String,
            required: [true, "Please enter address"],
        },
        salary: {
            type: String,
            required: [true, "Please enter salary"],
        },
        ProfilePicture: {
            type: String,
            required: [true, "Please enter picture"],
        },
        contact: {
            type: String,
            required: [true, "Please enter contact number"],
        },
        userRole: {
            type: String,
            required: [true, "Please enter user role"],
        },
        salary: {
            type: String,
            required: [true, "Please enter salary"],
        },
        status: {
            type: String,
            default: "Active",
            required: [true, "Please enter status"],
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: [true, "Please specify the school this teacher belongs to"],
        },
    },
    {
        timestamps: true,
    }
);

const OtherUsers = mongoose.model("OtherUsers", otherUsersSchema);

export default OtherUsers;
