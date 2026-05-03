const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// GET /api/feedback/my — student gets all their feedback notifications
router.get('/my', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Students only.' });
    }
    const feedbacks = await Feedback.find({ student: req.user.userId }).sort({ sentAt: -1 });
    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/feedback/:id/read — mark feedback as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Feedback.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/feedback/unread-count — student gets count of unread feedback
router.get('/unread-count', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ count: 0 });
    const count = await Feedback.countDocuments({ student: req.user.userId, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
