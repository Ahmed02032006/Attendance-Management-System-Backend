import mongoose from "mongoose";

const classTeacherSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  subject: {
    type: String,
    required: [true, "Please enter subject"],
  }
});

const classSchema = mongoose.Schema({
  classId: {
    type: String,
    required: [true, "Please enter class id"],
  },
  name: {
    type: String,
    required: [true, "Please enter class name"],
  },
  section: {
    type: String,
    required: [true, "Please enter section"],
  },
  roomNo: {
    type: String,
    required: [true, "Please enter room number"],
  },
  students: {
    type: Number,
    required: [true, "Please enter number of students"],
    default: 0,
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  teachers: [classTeacherSchema],
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active",
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
}, { timestamps: true });

const Class = mongoose.model("Class", classSchema);
export default Class;