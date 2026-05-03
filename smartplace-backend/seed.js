const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Job = require('./models/Job');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartplace';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await User.deleteMany({});
  await Job.deleteMany({});
  console.log('🧹 Cleared existing data');

  const salt = await bcrypt.genSalt(10);

  // ─── COORDINATORS ────────────────────────────────────────────
  const coordinators = await User.insertMany([
    { name: 'Dr. Ananya Sharma', email: 'ananya@college.edu', password: await bcrypt.hash('password123', salt), role: 'coordinator' },
    { name: 'Prof. Rajan Nair',  email: 'rajan@college.edu',  password: await bcrypt.hash('password123', salt), role: 'coordinator' },
  ]);
  console.log(`👩‍💼 Seeded ${coordinators.length} coordinators`);

  // ─── INTERVIEWERS ─────────────────────────────────────────────
  const interviewers = await User.insertMany([
    { name: 'Arjun Mehta',  email: 'arjun@google.com',   password: await bcrypt.hash('password123', salt), role: 'interviewer' },
    { name: 'Priya Kapoor', email: 'priya@amazon.com',   password: await bcrypt.hash('password123', salt), role: 'interviewer' },
    { name: 'Sneha Reddy',  email: 'sneha@infosys.com',  password: await bcrypt.hash('password123', salt), role: 'interviewer' },
  ]);
  console.log(`💼 Seeded ${interviewers.length} interviewers`);

  // ─── STUDENTS with PROFILES ────────────────────────────────────
  const students = await User.insertMany([
    {
      name: 'Rahul Verma', email: 'rahul@student.edu',
      password: await bcrypt.hash('password123', salt), role: 'student',
      profile: {
        cgpa: 8.9, branch: 'Computer Science', batch: '2026',
        skills: ['React', 'Node.js', 'MongoDB', 'Python'],
        certifications: ['AWS Cloud Practitioner', 'Meta Frontend Developer'],
        github: 'https://github.com/rahulverma',
        leetcode: 'https://leetcode.com/rahulverma',
        linkedin: 'https://linkedin.com/in/rahulverma',
        about: 'Passionate full-stack developer with 2+ years of project experience.'
      }
    },
    {
      name: 'Kavya Nair', email: 'kavya@student.edu',
      password: await bcrypt.hash('password123', salt), role: 'student',
      profile: {
        cgpa: 9.2, branch: 'Information Technology', batch: '2026',
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
        certifications: ['Google Data Analytics', 'IBM Data Science Professional'],
        github: 'https://github.com/kavyanair',
        leetcode: 'https://leetcode.com/kavyanair',
        linkedin: 'https://linkedin.com/in/kavyanair',
        about: 'ML enthusiast focused on NLP and computer vision projects.'
      }
    },
    {
      name: 'Aditya Singh', email: 'aditya@student.edu',
      password: await bcrypt.hash('password123', salt), role: 'student',
      profile: {
        cgpa: 7.8, branch: 'Electronics & Communication', batch: '2026',
        skills: ['C++', 'System Design', 'Java', 'Spring Boot'],
        certifications: ['Oracle Java SE Certified'],
        github: 'https://github.com/adityasingh',
        leetcode: 'https://leetcode.com/adityasingh',
        linkedin: 'https://linkedin.com/in/adityasingh',
        about: 'Backend developer with a strong foundation in algorithms and data structures.'
      }
    },
    {
      name: 'Meena Iyer', email: 'meena@student.edu',
      password: await bcrypt.hash('password123', salt), role: 'student',
      profile: {
        cgpa: 9.5, branch: 'Computer Science', batch: '2026',
        skills: ['SQL', 'Tableau', 'Excel', 'Python', 'Power BI'],
        certifications: ['Microsoft Certified: Data Analyst Associate', 'Google Data Analytics'],
        github: 'https://github.com/meenaiyer',
        leetcode: 'https://leetcode.com/meenaiyer',
        linkedin: 'https://linkedin.com/in/meenaiyer',
        about: 'Data analyst with experience building BI dashboards for business insights.'
      }
    },
    {
      name: 'Rohan Gupta', email: 'rohan@student.edu',
      password: await bcrypt.hash('password123', salt), role: 'student',
      profile: {
        cgpa: 8.1, branch: 'Computer Science', batch: '2026',
        skills: ['React', 'TypeScript', 'CSS', 'Git', 'Figma'],
        certifications: ['Meta Frontend Developer Professional Certificate'],
        github: 'https://github.com/rohangupta',
        leetcode: 'https://leetcode.com/rohangupta',
        linkedin: 'https://linkedin.com/in/rohangupta',
        about: 'Frontend developer who loves building clean, accessible user interfaces.'
      }
    },
  ]);
  console.log(`🎓 Seeded ${students.length} students with profiles`);

  // ─── JOBS & APPLICATIONS ──────────────────────────────────────
  const jobs = await Job.insertMany([
    {
      title: 'Software Development Engineer',
      company: 'Google', type: 'Full Time', package: '45 LPA',
      description: 'Work on large-scale distributed systems and products used by billions.',
      skills: ['React', 'Node.js', 'System Design', 'Python'],
      postedBy: interviewers[0]._id,
      deadline: new Date('2026-05-30'),
      applicants: [
        { student: students[0]._id, status: 'Shortlisted' },
        { student: students[1]._id, status: 'Applied' },
        { student: students[2]._id, status: 'Interviewed', feedback: 'Strong DSA skills. Needs improvement in system design.' },
      ],
    },
    {
      title: 'Data Analyst',
      company: 'Amazon', type: 'Internship', package: '₹80,000 / month',
      description: 'Analyze datasets to derive actionable insights for business decisions.',
      skills: ['SQL', 'Python', 'Excel', 'Tableau'],
      postedBy: interviewers[1]._id,
      deadline: new Date('2026-05-15'),
      applicants: [
        { student: students[3]._id, status: 'Shortlisted' },
        { student: students[4]._id, status: 'Rejected', feedback: 'Insufficient knowledge of Tableau and Power BI.' },
      ],
    },
    {
      title: 'Frontend Developer',
      company: 'Infosys', type: 'Full Time', package: '18 LPA',
      description: 'Build responsive, accessible web interfaces using modern JS frameworks.',
      skills: ['React', 'CSS', 'TypeScript', 'Git'],
      postedBy: interviewers[2]._id,
      deadline: new Date('2026-06-10'),
      applicants: [
        { student: students[0]._id, status: 'Applied' },
        { student: students[4]._id, status: 'Shortlisted' },
      ],
    },
    {
      title: 'Machine Learning Engineer',
      company: 'Microsoft', type: 'Full Time', package: '40 LPA',
      description: 'Design and implement ML models for Azure AI. Work with global cross-functional teams.',
      skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps'],
      postedBy: interviewers[0]._id,
      deadline: new Date('2026-06-01'),
      applicants: [
        { student: students[1]._id, status: 'Shortlisted' },
        { student: students[2]._id, status: 'Applied' },
      ],
    },
    {
      title: 'Backend Developer',
      company: 'Flipkart', type: 'Full Time', package: '22 LPA',
      description: "Build and scale microservices powering India's largest e-commerce platform.",
      skills: ['Java', 'Spring Boot', 'Kafka', 'MySQL'],
      postedBy: interviewers[1]._id,
      deadline: new Date('2026-05-25'),
      applicants: [],
    },
  ]);
  console.log(`📋 Seeded ${jobs.length} jobs`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETE! Login credentials (password: password123)');
  console.log('\n👩‍💼 COORDINATOR: ananya@college.edu | rajan@college.edu');
  console.log('💼 INTERVIEWER:  arjun@google.com  | priya@amazon.com  | sneha@infosys.com');
  console.log('🎓 STUDENT:      rahul@student.edu | kavya@student.edu | aditya@student.edu | meena@student.edu | rohan@student.edu');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seeding failed:', err); process.exit(1); });
