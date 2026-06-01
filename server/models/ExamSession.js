const mongoose = require('mongoose');

const behavioralEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'tab_switch',
      'copy_attempt',
      'paste_attempt',
      'right_click',
      'keyboard_shortcut',
      'window_blur',
      'window_focus',
      'idle_detected',
      'rapid_answer',
      'erratic_mouse',
      'scroll_anomaly',
      'answer_changed',
      'dev_tools_attempt',
      'fullscreen_exit',
    ],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
});

const answerSchema = new mongoose.Schema({
  questionId: mongoose.Schema.Types.ObjectId,
  answer: String,
  timeSpent: Number, // seconds
  changedCount: { type: Number, default: 0 },
  answeredAt: Date,
});

const examSessionSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
    status: { type: String, enum: ['active', 'submitted', 'flagged', 'terminated'], default: 'active' },
    answers: [answerSchema],
    behavioralEvents: [behavioralEventSchema],
    anomalyScore: { type: Number, default: 0 }, // 0-100
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    flagged: { type: Boolean, default: false },
    flagReasons: [String],
    score: { type: Number, default: null },
    ipAddress: String,
    userAgent: String,
    // Derived stats
    stats: {
      tabSwitches: { type: Number, default: 0 },
      copyAttempts: { type: Number, default: 0 },
      pasteAttempts: { type: Number, default: 0 },
      idlePeriods: { type: Number, default: 0 },
      windowBlurs: { type: Number, default: 0 },
      rightClicks: { type: Number, default: 0 },
      keyboardShortcuts: { type: Number, default: 0 },
      devToolsAttempts: { type: Number, default: 0 },
      fullscreenExits: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// Recalculate anomaly score before save
examSessionSchema.pre('save', function (next) {
  const s = this.stats;
  let score = 0;

  score += Math.min(s.tabSwitches * 10, 30);
  score += Math.min(s.copyAttempts * 15, 25);
  score += Math.min(s.pasteAttempts * 15, 25);
  score += Math.min(s.windowBlurs * 8, 20);
  score += Math.min(s.devToolsAttempts * 20, 30);
  score += Math.min(s.keyboardShortcuts * 5, 15);
  score += Math.min(s.rightClicks * 3, 10);
  score += Math.min(s.fullscreenExits * 12, 20);
  score += Math.min(s.idlePeriods * 5, 15);

  this.anomalyScore = Math.min(score, 100);

  if (this.anomalyScore >= 75) this.riskLevel = 'critical';
  else if (this.anomalyScore >= 50) this.riskLevel = 'high';
  else if (this.anomalyScore >= 25) this.riskLevel = 'medium';
  else this.riskLevel = 'low';

  if (this.anomalyScore >= 70) this.flagged = true;

  next();
});

module.exports = mongoose.model('ExamSession', examSessionSchema);
