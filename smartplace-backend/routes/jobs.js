const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');

// POST /api/jobs — create job (interviewer/coordinator only)
router.post('/', auth, async (req, res) => {
  try {
    if (!['interviewer', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only interviewers/coordinators can post jobs.' });
    }
    const { title, company, type, package: pkg, description, skills, deadline } = req.body;
    const job = new Job({ title, company, type, package: pkg, description, skills, deadline, postedBy: req.user.userId });
    await job.save();
    res.status(201).json({ message: 'Job posted successfully.', job });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/jobs — get all active jobs (students + logged-in users)
router.get('/', auth, async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true }).select('-applicants').sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/jobs/:id/apply — student applies to job
router.post('/:id/apply', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can apply.' });
    }
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    const alreadyApplied = job.applicants.find(a => a.student.toString() === req.user.userId);
    if (alreadyApplied) return res.status(400).json({ message: 'You have already applied to this job.' });

    job.applicants.push({ student: req.user.userId });
    await job.save();
    res.json({ message: 'Applied successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/jobs/my-applications — student gets their applications
router.get('/my-applications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only.' });
    const jobs = await Job.find({ 'applicants.student': req.user.userId });
    const applications = jobs.map(job => {
      const myApp = job.applicants.find(a => a.student.toString() === req.user.userId);
      return {
        jobId: job._id,
        title: job.title,
        company: job.company,
        type: job.type,
        status: myApp.status,
        feedback: myApp.feedback,
        appliedAt: myApp.appliedAt
      };
    });
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/jobs/:id/applicants — interviewer/coordinator gets all applicants for a job
router.get('/:id/applicants', auth, async (req, res) => {
  try {
    if (!['interviewer', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Interviewers/Coordinators only.' });
    }
    const job = await Job.findById(req.params.id).populate('applicants.student', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    res.json({ applicants: job.applicants, jobTitle: job.title });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/jobs/:id/applicants/:studentId — update applicant status + feedback
router.patch('/:id/applicants/:studentId', auth, async (req, res) => {
  try {
    if (!['interviewer', 'coordinator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Interviewers/Coordinators only.' });
    }
    const { status, feedback } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });

    const applicant = job.applicants.find(a => a.student.toString() === req.params.studentId);
    if (!applicant) return res.status(404).json({ message: 'Applicant not found in this job.' });

    if (status) applicant.status = status;
    if (feedback) applicant.feedback = feedback;
    await job.save();
    res.json({ message: 'Applicant status updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
