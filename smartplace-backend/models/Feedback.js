const mongoose = require('mongoose');

// Stores AI-generated or manual feedback dispatched to students
const FeedbackSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  company: { type: String, required: true },
  jobTitle: { type: String, required: true },
  type: {
    type: String,
    enum: ['pre_filter', 'interview_rejection'],
    required: true
  },
  // AI-generated or manual message
  message: { type: String, required: true },
  missingSkills: [{ type: String }],
  cgpaGap: { type: Number, default: null },
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
