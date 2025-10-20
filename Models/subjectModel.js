import mongoose from "mongoose";

const subjectSchema = mongoose.Schema({
    subjectTitle: {
        type: String,
        required: [true, "Please enter subject title"],
        trim: true
    },
    subjectName: {
        type: String,
        required: [true, "Please enter subject name"],
        trim: true
    },
    subjectCode: {
        type: String,
        required: [true, "Please enter subject code"],
        unique: true,
        trim: true,
        uppercase: true
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
        required: true
    },
    semester: {
        type: String,
        required: [true, "Please enter semester"],
        trim: true
    },
    createdDate: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Please enter user ID"]
    }
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;