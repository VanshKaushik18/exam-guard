const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'short', 'long'], default: 'mcq' },
  options: [String],
  correctAnswer: String,
  marks: { type: Number, default: 1 },
});

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, required: true }, // minutes
    questions: [questionSchema],
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    anomalyThresholds: {
      tabSwitchWarnings: { type: Number, default: 3 },
      copyPasteWarnings: { type: Number, default: 2 },
      idleTimeoutSeconds: { type: Number, default: 60 },
      rapidAnswerSeconds: { type: Number, default: 5 },
      suspiciousScore: { type: Number, default: 70 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
