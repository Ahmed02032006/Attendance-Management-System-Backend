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
    classScheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Optional for backward compatibility
        ref: "Subject.classSchedule"
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
    }
}, { timestamps: true });

// Update unique compound index to include classScheduleId
attendanceSchema.index(
    { rollNo: 1, subjectId: 1, classScheduleId: 1, date: 1 },
    {
        unique: true,
        name: "unique_attendance_per_class",
        partialFilterExpression: {
            rollNo: { $exists: true },
            subjectId: { $exists: true },
            classScheduleId: { $exists: true },
            date: { $exists: true }
        }
    }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;