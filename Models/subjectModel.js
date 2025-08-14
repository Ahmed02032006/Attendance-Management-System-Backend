import mongoose from "mongoose";

const subjectSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter the subject name"],
  },
  code: {
    type: String,
    unique: true,
    required: [true, "Please enter the subject code"],
  },
  medium: {
    type: String,
    required: [true, "Please select a medium"],
  },
  category: {
    type: String,
    required: [true, "Please select a category"],
  },
  classes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Please select the class"],
    }
  ],
  teachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Please select the teacher"],
    }
  ],
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    required: true,
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: [true, "Please specify the school this student belongs to"],
  },
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;