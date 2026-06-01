const express = require('express');
const ExamSession = require('../models/ExamSession');
const Exam = require('../models/Exam');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats for instructor
router.get('/dashboard', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ instructor: req.user._id }).select('_id');
    const examIds = exams.map((e) => e._id);

    const sessions = await ExamSession.find({ exam: { $in: examIds } });

    const totalSessions = sessions.length;
    const flaggedSessions = sessions.filter((s) => s.flagged).length;
    const avgAnomalyScore =
      totalSessions > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.anomalyScore, 0) / totalSessions)
        : 0;

    const riskBreakdown = {
      low: sessions.filter((s) => s.riskLevel === 'low').length,
      medium: sessions.filter((s) => s.riskLevel === 'medium').length,
      high: sessions.filter((s) => s.riskLevel === 'high').length,
      critical: sessions.filter((s) => s.riskLevel === 'critical').length,
    };

    const eventTypeCounts = {};
    sessions.forEach((s) => {
      s.behavioralEvents.forEach((e) => {
        eventTypeCounts[e.type] = (eventTypeCounts[e.type] || 0) + 1;
      });
    });

    res.json({
      totalExams: exams.length,
      totalSessions,
      flaggedSessions,
      avgAnomalyScore,
      riskBreakdown,
      eventTypeCounts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Per-exam analytics
router.get('/exam/:examId', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    const sessions = await ExamSession.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .sort('-anomalyScore');

    const anomalyDistribution = sessions.map((s) => ({
      student: s.student?.name,
      score: s.anomalyScore,
      riskLevel: s.riskLevel,
      flagged: s.flagged,
    }));

    res.json({ sessions, anomalyDistribution });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
