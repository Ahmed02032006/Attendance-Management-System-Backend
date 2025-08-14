import Timetable from '../../Models/timeTableModel.js';

// Create new timetable
export const createTimetable = async (req, res) => {
  try {
    const newTimetable = new Timetable(req.body);
    const savedTimetable = await newTimetable.save();
    res.status(201).json({ success: true, data: savedTimetable });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all timetables by schoolId
export const getAllTimetablesBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const timetables = await Timetable.find({ schoolId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single timetable by ID
export const getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }
    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update timetable
export const updateTimetable = async (req, res) => {
  try {
    const updated = await Timetable.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete timetable
export const deleteTimetable = async (req, res) => {
  try {
    const deleted = await Timetable.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }
    res.status(200).json({ success: true, message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
