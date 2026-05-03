const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const auth = require('../middleware/auth');
const User = require('../models/User');

// ─── Multer storage config ─────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${req.user.userId}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, or DOCX files are allowed.'));
  }
});

// POST /api/resume/upload — student uploads their resume
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can upload resumes.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/resumes/${req.file.filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { 'profile.resumeUrl': fileUrl } },
      { new: true }
    ).select('-password');

    res.json({ message: 'Resume uploaded successfully!', resumeUrl: fileUrl, user: updatedUser });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ message: err.message || 'Server error during upload.' });
  }
});

// GET /api/resume/:studentId — coordinator/interviewer downloads a student resume
router.get('/:studentId', auth, async (req, res) => {
  try {
    if (!['coordinator', 'interviewer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const student = await User.findById(req.params.studentId).select('profile.resumeUrl name');
    if (!student || !student.profile?.resumeUrl) {
      return res.status(404).json({ message: 'Resume not found for this student.' });
    }

    const filePath = path.join(__dirname, '..', student.profile.resumeUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file was deleted from server.' });
    }

    res.download(filePath, `Resume_${student.name.replace(/ /g, '_')}.pdf`);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/resume/analyze — Smart AI analysis of student's own resume
router.get('/analyze', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Students only.' });

    const user = await User.findById(req.user.userId).select('profile.resumeUrl');
    if (!user || !user.profile?.resumeUrl) {
      return res.status(400).json({ message: 'Please upload a resume first.' });
    }

    const filePath = path.join(__dirname, '..', user.profile.resumeUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Resume file not found on server.' });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const text = data.text.toLowerCase();

    // ─── Simple AI-Style Keyword Analysis ─────────────────
    const sections = {
      contact: ['contact', 'email', 'phone', 'address', 'linkedin', 'github'],
      education: ['education', 'degree', 'university', 'college', 'school', 'cgpa'],
      experience: ['experience', 'work', 'internship', 'employment', 'history'],
      projects: ['project', 'technical', 'development'],
      skills: ['skills', 'technologies', 'tools', 'languages', 'frameworks'],
      achievements: ['achievements', 'awards', 'honours', 'certifications']
    };

    const analysis = {
      score: 0,
      missingSections: [],
      foundSections: [],
      atsFormatTips: [],
      extractedSkills: []
    };

    // Check sections
    for (const [key, keywords] of Object.entries(sections)) {
      const found = keywords.some(k => text.includes(k));
      if (found) {
        analysis.foundSections.push(key);
        analysis.score += 15;
      } else {
        analysis.missingSections.push(key);
      }
    }

    // Skill extraction (basic)
    const commonSkills = ['react', 'node', 'javascript', 'python', 'java', 'sql', 'mongodb', 'c++', 'aws', 'docker', 'machine learning', 'data analysis', 'html', 'css', 'git'];
    analysis.extractedSkills = commonSkills.filter(s => text.includes(s));

    // ATS Tips
    if (text.length < 500) analysis.atsFormatTips.push("Your resume seems too short. ATS systems prefer detailed descriptions of roles and projects.");
    if (!analysis.foundSections.includes('skills')) analysis.atsFormatTips.push("Missing a clear 'Skills' section. Add a dedicated section for technical tools.");
    if (!analysis.foundSections.includes('experience') && !analysis.foundSections.includes('projects')) {
      analysis.atsFormatTips.push("No work experience or projects detected. This is a critical gap for placement resumes.");
    }
    if (text.includes('career objective') || text.includes('curriculum vitae')) {
      analysis.atsFormatTips.push("Remove outdated headers like 'Curriculum Vitae' or 'Career Objective'. Use a modern focus summary instead.");
    }
    if (analysis.extractedSkills.length < 3) {
      analysis.atsFormatTips.push("Few technical skills detected. Ensure you list all your frameworks, languages, and tools clearly.");
    }

    // Cap score at 100
    if (analysis.score > 90) analysis.score = 95; // room for improvement always
    if (analysis.foundSections.length === 6) analysis.score = 100;

    res.json({
      analysis,
      message: "Resume analysis complete."
    });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ message: 'Error analyzing resume. Make sure it is a valid PDF.' });
  }
});

module.exports = router;
