const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/user/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/user/profile — student updates their own profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can update a profile.' });
    }
    const { cgpa, branch, batch, skills, certifications, github, leetcode, linkedin, about } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'profile.cgpa': cgpa,
          'profile.branch': branch,
          'profile.batch': batch,
          'profile.skills': skills,
          'profile.certifications': certifications,
          'profile.github': github,
          'profile.leetcode': leetcode,
          'profile.linkedin': linkedin,
          'profile.about': about,
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/user/students — with optional filters: cgpa, skill, branch
router.get('/students', auth, async (req, res) => {
  try {
    if (!['coordinator', 'interviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { minCgpa, skill, branch } = req.query;
    const filter = { role: 'student' };

    if (minCgpa && !isNaN(parseFloat(minCgpa))) {
      filter['profile.cgpa'] = { $gte: parseFloat(minCgpa) };
    }
    if (branch && branch.trim() !== '') {
      filter['profile.branch'] = { $regex: branch.trim(), $options: 'i' };
    }
    if (skill && skill.trim() !== '') {
      filter['profile.skills'] = { $regex: skill.trim(), $options: 'i' };
    }

    const students = await User.find(filter).select('-password').sort({ 'profile.cgpa': -1 });
    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/user/interviewers
router.get('/interviewers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator only.' });
    }
    const interviewers = await User.find({ role: 'interviewer' }).select('-password');
    res.json({ interviewers });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/user/students/:id — get one student's full profile
router.get('/students/:id', auth, async (req, res) => {
  try {
    if (!['coordinator', 'interviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const student = await User.findById(req.params.id).select('-password');
    if (!student || student.role !== 'student') return res.status(404).json({ message: 'Student not found.' });
    res.json({ student });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;

