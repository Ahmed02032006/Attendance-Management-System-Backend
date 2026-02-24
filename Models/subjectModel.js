import mongoose from "mongoose";

const studentSchema = mongoose.Schema({
    registrationNo: {
        type: String,
        required: [true, "Please enter registration number"],
        trim: true
    },
    studentName: {
        type: String,
        required: [true, "Please enter student name"],
        trim: true
    }
}, { _id: true });

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
    },
    creditHours: {
        type: String,
        required: [true, "Please enter credit hours"],
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
    },
    registeredStudents: [studentSchema] // New field for registered students
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;