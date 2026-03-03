import mongoose from "mongoose";

const classScheduleSchema = mongoose.Schema({
    day: {
        type: String,
        required: [true, "Please enter class day"],
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    },
    startTime: {
        type: String,
        required: [true, "Please enter start time"],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter valid time in HH:MM format"]
    },
    endTime: {
        type: String,
        required: [true, "Please enter end time"],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please enter valid time in HH:MM format"]
    }
}, { _id: true });

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
    },
    discipline: {
        type: String,
        required: [true, "Please enter student discipline"],
        trim: true
    }
}, { _id: true });

const subjectSchema = mongoose.Schema({
    subjectTitle: {
        type: String,
        required: [true, "Please enter course title"],
        trim: true
    },
    departmentOffering: {
        type: String,
        required: [true, "Please enter department offering the course"],
        trim: true
    },
    subjectCode: {
        type: String,
        required: [true, "Please enter course code"],
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
    classSchedule: [classScheduleSchema], // New field for multiple class days and times
    createdDate: {
        type: Date,
        default: Date.now
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Please enter user ID"]
    },
    registeredStudents: [studentSchema]
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;