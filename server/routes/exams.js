const express = require('express');
const Exam = require('../models/Exam');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Get all exams (instructor sees their own; students see active)
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'instructor') query.instructor = req.user._id;
    else query.status = 'active';

    const exams = await Exam.find(query).populate('instructor', 'name email').sort('-createdAt');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create exam (instructor only)
router.post('/', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, instructor: req.user._id });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single exam
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('instructor', 'name email');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update exam
router.put('/:id', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, instructor: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete exam
router.delete('/:id', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    await Exam.findOneAndDelete({ _id: req.params.id, instructor: req.user._id });
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Enroll student
router.post('/:id/enroll', protect, restrictTo('student'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { enrolledStudents: req.user._id } },
      { new: true }
    );
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
