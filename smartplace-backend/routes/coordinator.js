const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Feedback = require('../models/Feedback');

const upload = multer({ dest: 'uploads/' });

// ─── Guard: coordinator only ───────────────────────────────
const coordinatorOnly = (req, res, next) => {
  if (req.user.role !== 'coordinator') {
    return res.status(403).json({ message: 'Coordinator access only.' });
  }
  next();
};

// ════════════════════════════════════════════════════════════
// COMPANY MANAGEMENT
// ════════════════════════════════════════════════════════════

// POST /api/coordinator/companies — add a company
router.post('/companies', auth, coordinatorOnly, async (req, res) => {
  try {
    const { name, industry, website, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Company name is required.' });

    const company = new Company({ name, industry, website, description, addedBy: req.user.userId });
    await company.save();
    res.status(201).json({ message: 'Company added successfully.', company });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/coordinator/companies
router.get('/companies', auth, async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/coordinator/companies/:id
router.delete('/companies/:id', auth, coordinatorOnly, async (req, res) => {
  try {
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: 'Company removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
// SMART FILTER — Match students to a job's required skills & CGPA
// ════════════════════════════════════════════════════════════

/**
 * POST /api/coordinator/smart-filter
 * Body: { jobId? (optional), requiredSkills: [], minCgpa: number, company: string, jobTitle: string }
 * Returns: { eligible: [...students], notEligible: [...students with skillGap analysis] }
 */
router.post('/smart-filter', auth, coordinatorOnly, async (req, res) => {
  try {
    const { jobId, requiredSkills = [], minCgpa = 0, company, jobTitle } = req.body;

    let skills = requiredSkills;

    // If a jobId is provided, pull skills from the job itself
    if (jobId) {
      const job = await Job.findById(jobId);
      if (job) {
        skills = job.skills;
      }
    }

    // Fetch all students with profiles
    const students = await User.find({ role: 'student' }).select('-password');

    const eligible = [];
    const notEligible = [];

    students.forEach(s => {
      const studentSkills = (s.profile?.skills || []).map(sk => sk.toLowerCase());
      const studentCgpa = s.profile?.cgpa || 0;

      // Find which required skills the student is MISSING
      const missingSkills = skills.filter(reqSkill =>
        !studentSkills.includes(reqSkill.toLowerCase())
      );

      const cgpaGap = minCgpa > 0 ? (minCgpa - studentCgpa) : 0;
      const cgpaPassed = studentCgpa >= minCgpa;
      const skillsPassed = missingSkills.length === 0;

      if (skillsPassed && cgpaPassed) {
        eligible.push({
          _id: s._id,
          name: s.name,
          email: s.email,
          profile: s.profile,
          matchPercentage: 100
        });
      } else {
        // Calculate match %
        const totalRequired = skills.length;
        const matched = totalRequired - missingSkills.length;
        const matchPercentage = totalRequired > 0 ? Math.round((matched / totalRequired) * 100) : 0;

        // ── AI-style rule-based feedback message ──────────────────
        let message = `Dear ${s.name},\n\nThank you for your interest in the **${jobTitle}** position at **${company}**.\n\nAfter reviewing your profile, we regret to inform you that your profile did not meet all the eligibility criteria for this role.\n\n`;

        if (missingSkills.length > 0) {
          message += `📌 **Missing Required Skills:** ${missingSkills.join(', ')}\n`;
          message += `   We recommend you take the following actions:\n`;
          missingSkills.forEach(skill => {
            message += `   • Learn **${skill}** — search for courses on Coursera, Udemy, or YouTube.\n`;
          });
          message += `\n`;
        }

        if (!cgpaPassed && minCgpa > 0) {
          message += `📌 **CGPA Requirement Not Met:** Your current CGPA is ${studentCgpa || 'not set'}, but the minimum required is ${minCgpa}.\n`;
          message += `   Focus on improving your academic scores in upcoming semesters.\n\n`;
        }

        message += `We encourage you to upskill and apply again in future drives. Best of luck!\n\n— Placement Team`;

        notEligible.push({
          _id: s._id,
          name: s.name,
          email: s.email,
          profile: s.profile,
          missingSkills,
          cgpaGap: cgpaGap > 0 ? parseFloat(cgpaGap.toFixed(2)) : 0,
          matchPercentage,
          feedbackMessage: message
        });
      }
    });

    // Sort eligible by CGPA desc
    eligible.sort((a, b) => (b.profile?.cgpa || 0) - (a.profile?.cgpa || 0));
    // Sort not-eligible by match % desc
    notEligible.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({ eligible, notEligible, totalStudents: students.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during smart filter.' });
  }
});

// ════════════════════════════════════════════════════════════
// DISPATCH FEEDBACK to not-eligible students
// ════════════════════════════════════════════════════════════

/**
 * POST /api/coordinator/dispatch-feedback
 * Body: { students: [{ studentId, missingSkills, cgpaGap, feedbackMessage }], company, jobTitle, jobId? }
 */
router.post('/dispatch-feedback', auth, coordinatorOnly, async (req, res) => {
  try {
    const { students, company, jobTitle, jobId } = req.body;

    if (!students || students.length === 0) {
      return res.status(400).json({ message: 'No students provided.' });
    }

    const feedbackDocs = students.map(s => ({
      student: s.studentId,
      job: jobId || null,
      company,
      jobTitle,
      type: 'pre_filter',
      message: s.feedbackMessage,
      missingSkills: s.missingSkills || [],
      cgpaGap: s.cgpaGap || null
    }));

    await Feedback.insertMany(feedbackDocs);

    res.json({ message: `Feedback dispatched to ${students.length} student(s) successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error dispatching feedback.' });
  }
});

// GET /api/coordinator/feedback-stats
router.get('/feedback-stats', auth, coordinatorOnly, async (req, res) => {
  try {
    const total = await Feedback.countDocuments();
    const preFilter = await Feedback.countDocuments({ type: 'pre_filter' });
    const rejection = await Feedback.countDocuments({ type: 'interview_rejection' });
    res.json({ total, preFilter, rejection });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// ════════════════════════════════════════════════════════════
// CSV IMPORT & EXPORT (STUDENTS)
// ════════════════════════════════════════════════════════════

// GET /api/coordinator/export/students
router.get('/export/students', auth, coordinatorOnly, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    
    let csv = "Name,Email,CGPA,Branch,Batch,Skills,Certifications,AppliedJobsCount\n";
    
    for (const s of students) {
      const skills = s.profile?.skills ? `"${s.profile.skills.join(', ')}"` : '""';
      const certs = s.profile?.certifications ? `"${s.profile.certifications.join(', ')}"` : '""';
      const row = [
        `"${s.name}"`, 
        `"${s.email}"`, 
        s.profile?.cgpa || "", 
        `"${s.profile?.branch || ""}"`, 
        `"${s.profile?.batch || ""}"`, 
        skills, 
        certs,
        0 // Placeholder for applied jobs
      ].join(",");
      csv += row + "\n";
    }

    res.header('Content-Type', 'text/csv');
    res.attachment('smartplace_students.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export CSV.' });
  }
});

// POST /api/coordinator/import/students
router.post('/import/students', auth, coordinatorOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please upload a CSV file.' });

    const csvData = fs.readFileSync(req.file.path, 'utf8');
    const lines = csvData.split(/\r?\n/).filter(l => l.trim() !== '');

    if (lines.length < 2) return res.status(400).json({ message: 'CSV file is empty or missing headers.' });

    // Assuming Format: Name,Email,Password,CGPA,Branch,Batch
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length < 3) continue; // Minimum Name, Email, Password

      const [name, email, plainPassword, cgpaParam, branch, batch] = parts;
      if (!name || !email || !plainPassword) { skipped++; continue; }

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) { skipped++; continue; }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      const cgpa = cgpaParam && !isNaN(parseFloat(cgpaParam)) ? parseFloat(cgpaParam) : null;

      const newUser = new User({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'student',
        profile: { cgpa, branch: branch || '', batch: batch || '' }
      });
      await newUser.save();
      imported++;
    }

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    res.json({ message: `Import complete. Added ${imported} students. Skipped ${skipped} (duplicates or invalid).` });
  } catch (err) {
    console.error('CSV import error:', err);
    res.status(500).json({ message: 'Server error during CSV import.' });
  }
});

module.exports = router;
