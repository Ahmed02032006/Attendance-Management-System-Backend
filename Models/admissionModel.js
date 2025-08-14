import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, default: null },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
});

const admissionSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    grade: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    section: { type: String },
    rollNumber: { type: String },
    nationality: { type: String },
    religion: { type: String },
    previousSchool: { type: String },
    parentOrGuardianName: { type: String },
    parentOrGuardianEmail: { type: String },
    parentOrGuardianOccupation: { type: String },
    parentOrGuardianRelation: { type: String },
    contact: { type: String },
    phone: { type: String },
    address: { type: String },
    appliedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    documents: [documentSchema],
    profilePictureUrl: { type: String, default: '' },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Admission", admissionSchema);

// {
//   "applicationId": "APP12345",
//   "studentName": "John Doe",
//   "studentEmail": "john@example.com",
//   "grade": "10",
//   "dob": "2008-05-10",
//   "gender": "Male",
//   "section": "A",
//   "rollNumber": "15",
//   "nationality": "Pakistani",
//   "religion": "Islam",
//   "previousSchool": "ABC High School",
//   "parentOrGuardianName": "Mr. Doe",
//   "parentOrGuardianOccupation": "Engineer",
//   "parentOrGuardianRelation": "Father",
//   "relationship": "Father",
//   "contact": "03211234567",
//   "phone": "0213456789",
//   "address": "Street 123, Karachi",
//   "status": "Pending",
//   "schoolId": "64ab12ef12cd34ab56cd78ef",
//   "documents": [
//     {
//       "name": "Birth Certificate",
//       "file": "uploads/birth-cert.pdf",
//       "status": "Pending"
//     }
//   ],
//   "profilePictureUrl": "uploads/profile-john.jpg"
// }
