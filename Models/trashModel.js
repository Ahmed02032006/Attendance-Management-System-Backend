import mongoose from "mongoose";

// Schema for storing class schedule of deleted subject
const deletedClassScheduleSchema = mongoose.Schema({
    day: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    }
}, { _id: true });

// Schema for storing registered students of deleted subject
const deletedStudentSchema = mongoose.Schema({
    registrationNo: {
        type: String,
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    discipline: {
        type: String,
        required: true
    }
}, { _id: true });

// Schema for storing attendance records of deleted subject
const deletedAttendanceSchema = mongoose.Schema({
    studentName: {
        type: String,
        required: true
    },
    rollNo: {
        type: String,
        required: true
    },
    discipline: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    originalAttendanceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, { _id: true });

// Main Trash Schema
const trashSchema = mongoose.Schema({
    // Original subject ID (for reference)
    originalSubjectId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true
    },

    // Subject details
    subjectDetails: {
        subjectTitle: {
            type: String,
            required: true
        },
        departmentOffering: {
            type: String,
            required: true
        },
        subjectCode: {
            type: String,
            required: true
        },
        creditHours: {
            type: String,
            required: true
        },
        session: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        },
        semester: {
            type: String,
            required: true
        },
        classSchedule: [deletedClassScheduleSchema],
        createdDate: {
            type: Date,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        registeredStudents: [deletedStudentSchema]
    },

    // All attendance records for this subject
    attendanceRecords: [deletedAttendanceSchema],

    // Deletion metadata
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    deletedAt: {
        type: Date,
        default: Date.now
    },
    deletedFrom: {
        type: String,
        enum: ["Teacher", "Admin"],
        required: true
    },

    // Recovery status
    isRecovered: {
        type: Boolean,
        default: false
    },
    recoveredAt: {
        type: Date
    },
    recoveredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    expiresAt: {
        type: Date,
        required: true,
    }
}, {
    timestamps: true
});

// Indexes for better query performance
trashSchema.index({ originalSubjectId: 1 });
trashSchema.index({ deletedBy: 1 });
trashSchema.index({ deletedAt: -1 });
trashSchema.index({ isRecovered: 1 });
trashSchema.index({ 'subjectDetails.userId': 1 });
trashSchema.index({ 'subjectDetails.subjectCode': 1 });

const Trash = mongoose.model("Trash", trashSchema);
export default Trash;