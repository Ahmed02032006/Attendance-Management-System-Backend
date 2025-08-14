import mongoose from "mongoose";

const attendanceSchema = mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["present", "absent", "late"],
    required: true,
  },
  checkIn: {
    type: String,
    required: true,
  },
  checkOut: {
    type: String,
    required: true,
  },
  leaveRequest: {
    type: Boolean,
    default: false,
  },
  reason: {
    type: String,
  },
  leaveType: {
    type: String,
    enum: ["sick", "personal", "casual"],
  },
  lateReason: {
    type: String,
  },
});

const leaveRequestSchema = mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reason: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["sick", "personal", "casual"],
    required: true,
  },
  notes: {
    type: String,
  },
});

const teacherSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: [true, "Please enter your teacher Id"],
    },
    teacherName: {
      type: String,
      required: [true, "Please enter your name"],
    },
    teacherEmail: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      trim: true,
    },
    teacherPassword: {
      type: String,
      required: [true, "Please enter your password"],
    },
    teacherGender: {
      type: String,
      required: [true, "Please enter your gender"],
    },
    salary: {
      type: String,
      required: [true, "Please enter your salary"],
    },
    experienceYears: {
      type: String,
      required: [true, "Please enter your experience Years"],
    },
    teacherProfilePicture: {
      type: String,
      required: [true, "Please enter your picture"],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "Please specify the school this teacher belongs to"],
    },
    department: {
      type: String,
      required: [true, "Please specify a department"],
      trim: true,
    },
    contact: {
      type: String,
      required: [true, "Please enter your contact number"],
    },
    qualification: {
      type: String,
      required: [true, "Please enter your qualification"],
    },
    status: {
      type: String,
      default: "Active",
      required: [true, "Please enter status"],
    },
    attendance: [attendanceSchema],
    leaveRequests: [leaveRequestSchema],
  },
  {
    timestamps: true,
  }
);

const Teacher = mongoose.model("Teacher", teacherSchema);

export default Teacher;
