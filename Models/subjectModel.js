import mongoose from "mongoose";

const subjectSchema = mongoose.Schema({
    subjectTitle: {
        type: String,
        required: [true, "Please enter subject title"],
        trim: true
    },
    departmentOffering: { 
        type: String,
        required: [true, "Please enter department offering the course"],
        trim: true
    },
    subjectCode: {
        type: String,
        required: [true, "Please enter subject code"],
        unique: true,
        trim: true,
        // uppercase: true
    },
    creditHours: {
        type: Number,
        required: [true, "Please enter credit hours"],
        min: [1, "Credit hours must be at least 1"],
        max: [6, "Credit hours cannot exceed 6"]
    },
    session: {
        type: String,
        required: [true, "Please enter session"],
        trim: true
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