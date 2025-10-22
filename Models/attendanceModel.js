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
    ipAddress:{
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

// Add unique compound index to prevent duplicates
attendanceSchema.index(
  { rollNo: 1, subjectId: 1, date: 1 }, 
  { 
    unique: true, 
    name: "unique_attendance_per_day",
    partialFilterExpression: { 
      rollNo: { $exists: true }, 
      subjectId: { $exists: true }, 
      date: { $exists: true } 
    }
  }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;