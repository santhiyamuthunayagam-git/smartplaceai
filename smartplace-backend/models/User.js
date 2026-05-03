const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'coordinator', 'interviewer'], required: true },

  // ─── Student Profile Fields ────────────────────────────────
  profile: {
    cgpa: { type: Number, min: 0, max: 10, default: null },
    branch: { type: String, default: '' },
    batch: { type: String, default: '' },
    skills: [{ type: String }],
    certifications: [{ type: String }],
    github: { type: String, default: '' },
    leetcode: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    about: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },  // stored file path
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);

