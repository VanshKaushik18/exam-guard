const express = require('express');
const ExamSession = require('../models/ExamSession');
const Exam = require('../models/Exam');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { sendFlagAlert } = require('../services/emailService');

const router = express.Router();

// Track which sessions have already had an alert sent (in-memory, resets on restart)
const alertedSessions = new Set();

// Start exam session
router.post('/start', protect, restrictTo('student'), async (req, res) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (exam.status !== 'active') return res.status(400).json({ message: 'Exam is not active' });

    // Check if already has active session
    const existing = await ExamSession.findOne({ exam: examId, student: req.user._id, status: 'active' });
    if (existing) return res.json(existing);

    const session = await ExamSession.create({
      exam: examId,
      student: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Log behavioral event (called frequently by frontend)
router.post('/:id/event', protect, async (req, res) => {
  try {
    const { type, metadata, severity } = req.body;
    const session = await ExamSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.student.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Unauthorized' });

    const event = { type, metadata: metadata || {}, severity: severity || 'low' };
    session.behavioralEvents.push(event);

    // Update stats
    const statMap = {
      tab_switch: 'tabSwitches',
      copy_attempt: 'copyAttempts',
      paste_attempt: 'pasteAttempts',
      window_blur: 'windowBlurs',
      idle_detected: 'idlePeriods',
      right_click: 'rightClicks',
      keyboard_shortcut: 'keyboardShortcuts',
      dev_tools_attempt: 'devToolsAttempts',
      fullscreen_exit: 'fullscreenExits',
    };
    if (statMap[type]) session.stats[statMap[type]]++;

    await session.save();

    // Emit to instructor via socket
    const io = req.app.get('io');
    io.to(`instructor-${session.exam}`).emit('anomaly-update', {
      sessionId: session._id,
      studentId: session.student,
      event,
      anomalyScore: session.anomalyScore,
      riskLevel: session.riskLevel,
      stats: session.stats,
    });

    // Send email alert when session first becomes flagged
    if (session.flagged && !alertedSessions.has(session._id.toString())) {
      alertedSessions.add(session._id.toString());
      (async () => {
        try {
          const exam = await Exam.findById(session.exam).populate('instructor', 'name email');
          const student = await User.findById(session.student).select('name email');
          if (exam && student && exam.instructor) {
            await sendFlagAlert({
              instructorEmail: exam.instructor.email,
              instructorName: exam.instructor.name,
              studentName: student.name,
              studentEmail: student.email,
              examTitle: exam.title,
              anomalyScore: session.anomalyScore,
              riskLevel: session.riskLevel,
              sessionId: session._id,
              eventSummary: session.stats,
            });
          }
        } catch (e) {
          console.error('Email alert error:', e.message);
        }
      })();
    }

    res.json({ anomalyScore: session.anomalyScore, riskLevel: session.riskLevel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save answer
router.post('/:id/answer', protect, async (req, res) => {
  try {
    const { questionId, answer, timeSpent } = req.body;
    const session = await ExamSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const existingIdx = session.answers.findIndex((a) => a.questionId?.toString() === questionId);
    if (existingIdx >= 0) {
      session.answers[existingIdx].answer = answer;
      session.answers[existingIdx].changedCount++;
      session.answers[existingIdx].timeSpent = timeSpent;
      session.answers[existingIdx].answeredAt = new Date();
    } else {
      session.answers.push({ questionId, answer, timeSpent, answeredAt: new Date() });
    }

    await session.save();
    res.json({ message: 'Answer saved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit exam
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.id).populate('exam');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.status = session.flagged ? 'flagged' : 'submitted';
    session.submittedAt = new Date();

    // Auto-grade MCQ
    let score = 0;
    const exam = session.exam;
    session.answers.forEach((ans) => {
      const q = exam.questions.id(ans.questionId);
      if (q && q.type === 'mcq' && q.correctAnswer === ans.answer) {
        score += q.marks;
      }
    });
    session.score = score;

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get session by ID (instructor or own student)
router.get('/:id', protect, async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.id)
      .populate('student', 'name email')
      .populate('exam', 'title duration questions');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all sessions for an exam (instructor)
router.get('/exam/:examId', protect, restrictTo('instructor', 'admin'), async (req, res) => {
  try {
    const sessions = await ExamSession.find({ exam: req.params.examId })
      .populate('student', 'name email')
      .sort('-anomalyScore');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student's own sessions
router.get('/my/sessions', protect, restrictTo('student'), async (req, res) => {
  try {
    const sessions = await ExamSession.find({ student: req.user._id })
      .populate('exam', 'title duration')
      .sort('-createdAt');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
