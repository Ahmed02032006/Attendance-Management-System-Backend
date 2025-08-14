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
  },
  checkOut: {
    type: String,
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

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, "Please enter student ID"],
      unique: true,
    },
    admissionNumber: {
      type: String,
      required: [true, "Please enter admission number"],
      unique: true,
    },
    registrationDate: {
      type: Date,
      required: [true, "Please enter registration date"],
      default: Date.now,
    },
    profilePicture: {
      type: String,
      default: "https://example.com/default-profile.jpg",
    },
    studentName: {
      type: String,
      required: [true, "Please enter student name"],
      trim: true,
    },
    studentEmail: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    studentPassword: {
      type: String,
      required: [true, "Please enter student password"],
      trim: true,
    },
    gender: {
      type: String,
      required: [true, "Please enter gender"],
      enum: ["Male", "Female", "Other"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Please enter date of birth"],
    },
    age: {
      type: Number,
      min: 3,
      max: 25,
    },
    nationality: {
      type: String,
      default: "Pakistani",
    },
    religion: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
      required: [true, "Please enter address"],
    },
    emergencyContactPhone: {
      type: String,
      required: [true, "Please enter emergency contact phone"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Please specify class"],
    },
    section: {
      type: String,
      required: [true, "Please specify section"],
      uppercase: true,
    },
    rollNumber: {
      type: String,
      required: [true, "Please enter roll number"],
    },
    admissionDate: {
      type: Date,
      required: [true, "Please enter admission date"],
    },
    previousSchool: {
      type: String,
    },
    academicYear: {
      type: String,
      required: [true, "Please enter academic year"],
    },
    currentStatus: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Transferred"],
      default: "Active",
    },
    attendance: [attendanceSchema],
    leaveRequests: [leaveRequestSchema],
    parentOrGuardianName: {
      type: String,
      required: [true, "Please enter parent/Guardian name"],
      trim: true,
    },
    parentOrGuardianRelation: {
      type: String,
      required: [true, "Please enter parent/Guardian relation"],
      trim: true,
    },
    parentOrGuardianEmail: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "Please specify the school this student belongs to"],
    },
  },
  {
    timestamps: true,
  }
);

const Student = mongoose.model("Student", studentSchema);

export default Student;

// {
//   "studentId": "STD001",
//   "admissionNumber": "ADM001",
//   "registrationDate": "2025-07-31",
//   "studentName": "Ali Raza",
//   "studentEmail": "ali@example.com",
//   "studentPassword": "password123",
//   "gender": "Male",
//   "dateOfBirth": "2008-06-10",
//   "age": 17,
//   "nationality": "Pakistani",
//   "religion": "Muslim",
//   "phone": "03001234567",
//   "address": "Karachi",
//   "emergencyContactPhone": "03111234567",
//   "classId": "64cc9b984e8e93c2f0df5f3a",
//   "section": "A",
//   "rollNumber": "10",
//   "admissionDate": "2023-08-01",
//   "previousSchool": "ABC School",
//   "academicYear": "2023-2024",
//   "parentOrGuardianName": "Raza Ahmed",
//   "parentOrGuardianRelation": "Father",
//   "parentOrGuardianEmail": "raza@example.com",
//   "schoolId": "64cc9b2b4e8e93c2f0df5f39"
// }
