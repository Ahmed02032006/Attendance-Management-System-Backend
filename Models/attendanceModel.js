import mongoose from "mongoose";

const attendanceSchema = mongoose.Schema({
    studentName: {
        type: String,
        required: [true, "Please enter student name"],
        trim: true
    },
    rollNo: {
        type: String,
        required: [true, "Please enter roll number"],
        trim: true,
    },
    discipline: {
        type: String,
        required: [true, "Please select discipline"],
        trim: true,
    },
    time: {
        type: String,
        required: [true, "Please enter time"],
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: [true, "Please enter subject ID"]
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    ipAddress: {
        type: String,
        required: true,
        trim: true
    },
    scheduleDay: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        required: false
    },
    scheduleTime: {
        type: String,
        required: false
    }
}, { timestamps: true });

// Update unique compound index to include scheduleDay and scheduleTime
attendanceSchema.index(
    { rollNo: 1, subjectId: 1, date: 1, scheduleDay: 1, scheduleTime: 1 },
    {
        unique: true,
        name: "unique_attendance_per_schedule",
        partialFilterExpression: {
            rollNo: { $exists: true },
            subjectId: { $exists: true },
            date: { $exists: true },
            scheduleDay: { $exists: true },
            scheduleTime: { $exists: true }
        }
    }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;