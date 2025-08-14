import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  time: { type: String, required: true },
  mon: { type: String, default: '' },
  tue: { type: String, default: '' },
  wed: { type: String, default: '' },
  thu: { type: String, default: '' },
  fri: { type: String, default: '' },
});

const timetableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  academicYear: { type: String, required: true },
  grade: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  lastUpdated: { type: Date, default: Date.now },
  periods: [periodSchema],
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: [true, "Please specify the school this student belongs to"],
  },
}, { timestamps: true });

const Timetable = mongoose.model('Timetable', timetableSchema);

export default Timetable;