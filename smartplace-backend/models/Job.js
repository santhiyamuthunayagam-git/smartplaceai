const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  type: { type: String, enum: ['Full Time', 'Internship', 'Contract'], default: 'Full Time' },
  package: { type: String },
  description: { type: String },
  skills: [{ type: String }],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicants: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Applied', 'Shortlisted', 'Interviewed', 'Rejected', 'Selected'], default: 'Applied' },
    appliedAt: { type: Date, default: Date.now },
    feedback: { type: String, default: '' }
  }],
  isActive: { type: Boolean, default: true },
  deadline: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);
