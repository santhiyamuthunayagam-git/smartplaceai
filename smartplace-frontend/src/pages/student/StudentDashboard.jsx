import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Sidebar";
import API from "../../axios";
import { toast } from "react-toastify";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState({});
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({ cgpa: "", branch: "", batch: "", skills: "", certifications: "", github: "", leetcode: "", linkedin: "", about: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Resume state
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingResume, setAnalyzingResume] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await API.get("/user/me");
        const u = res.data.user;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        if (u.profile) {
          setProfile({
            cgpa: u.profile.cgpa || "",
            branch: u.profile.branch || "",
            batch: u.profile.batch || "",
            skills: u.profile.skills?.join(", ") || "",
            certifications: u.profile.certifications?.join(", ") || "",
            github: u.profile.github || "",
            leetcode: u.profile.leetcode || "",
            linkedin: u.profile.linkedin || "",
            about: u.profile.about || "",
          });
        }
      } catch {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        setUser(u);
      }
    };
    loadUser();
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await API.get("/jobs");
      setJobs(res.data.jobs);
    } catch { toast.error("Failed to fetch jobs."); }
    finally { setLoadingJobs(false); }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const res = await API.get("/jobs/my-applications");
      setApplications(res.data.applications);
    } catch { toast.error("Failed to fetch applications."); }
    finally { setLoadingApps(false); }
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    try {
      const res = await API.get("/feedback/my");
      setFeedbacks(res.data.feedbacks);
    } catch { toast.error("Failed to fetch feedback."); }
    finally { setLoadingFeedback(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "jobs") fetchJobs();
    if (activeTab === "applications") fetchApplications();
    if (activeTab === "overview") { fetchApplications(); fetchFeedback(); fetchJobs(); }
    if (activeTab === "feedback") fetchFeedback();
  }, [activeTab, fetchJobs, fetchApplications, fetchFeedback]);

  // Calculate upcoming deadlines (less than 3 days left)
  const upcomingDeadlines = jobs.filter(j => {
    if (!j.deadline) return false;
    const daysLeft = (new Date(j.deadline) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 3.5;
  });

  const handleApply = async (jobId) => {
    setApplyingId(jobId);
    try {
      await API.post(`/jobs/${jobId}/apply`);
      toast.success("Applied successfully!");
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not apply.");
    } finally { setApplyingId(null); }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return toast.warning("Please select a PDF file first.");
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const res = await API.post("/resume/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setResumeFile(null);
      setAiAnalysis(null); // Reset analysis on new upload
      toast.success("Resume uploaded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAnalyzeResume = async () => {
    if (!user.profile?.resumeUrl) return toast.warning("Upload a resume first.");
    setAnalyzingResume(true);
    try {
      const res = await API.get("/resume/analyze");
      setAiAnalysis(res.data.analysis);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "AI Analysis failed.");
    } finally { setAnalyzingResume(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const parsedSkills = Array.isArray(profile.skills)
        ? profile.skills
        : (profile.skills || "").toString().split(",").map(s => s.trim()).filter(Boolean);

      const parsedCerts = Array.isArray(profile.certifications)
        ? profile.certifications
        : (profile.certifications || "").toString().split(",").map(s => s.trim()).filter(Boolean);

      const payload = {
        ...profile,
        cgpa: profile.cgpa === "" ? null : parseFloat(profile.cgpa) || null,
        skills: parsedSkills,
        certifications: parsedCerts,
      };

      const res = await API.put("/user/profile", payload);
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Profile saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save profile.");
    } finally { setSavingProfile(false); }
  };

  const tabs = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "profile", label: "My Profile", icon: "👤" },
    { key: "resume", label: "Resume", icon: "📄" },
    { key: "feedback", label: "My Feedback", icon: "📨" },
    { key: "jobs", label: "Job Board", icon: "💼" },
    { key: "applications", label: "My Applications", icon: "📝" },
  ];

  const statusColor = (s) => ({
    Applied: { bg: "#e2e3e5", color: "#383d41" },
    Shortlisted: { bg: "#d4edda", color: "#155724" },
    Interviewed: { bg: "#cce5ff", color: "#004085" },
    Selected: { bg: "#c3e6cb", color: "#1c5a2e" },
    Rejected: { bg: "#f8d7da", color: "#721c24" },
  }[s] || { bg: "#e2e3e5", color: "#383d41" });

  return (
    <div style={styles.container}>
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} role="student" />

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.greeting}>Welcome back, {user.name?.split(" ")[0] || "Student"}! 👋</h1>
            <p style={styles.subtitle}>Track your placements and discover new opportunities.</p>
          </div>
        </div>

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div style={styles.fadeAnim}>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📊</div>
                <div><div style={styles.statLabel}>CGPA</div><div style={styles.statValue}>{user.profile?.cgpa || "—"}</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📝</div>
                <div><div style={styles.statLabel}>Applications</div><div style={styles.statValue}>{applications.length || "0"}</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>✅</div>
                <div><div style={styles.statLabel}>Shortlisted</div><div style={styles.statValue}>{applications.filter(a => a.status === "Shortlisted").length}</div></div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🛠️</div>
                <div><div style={styles.statLabel}>Skills</div><div style={styles.statValue}>{user.profile?.skills?.length || "0"}</div></div>
              </div>
            </div>

            {/* Deadline Alert Banner */}
            {upcomingDeadlines.length > 0 && (
              <div style={{ background: "#fff5f5", borderLeft: "4px solid #e53e3e", padding: 20, borderRadius: 12, marginTop: 6, marginBottom: 20, boxShadow: "0 4px 12px rgba(229,62,62,0.1)", animation: "pulse 2s infinite" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>🚨</span>
                  <strong style={{ color: "#c53030", fontSize: 18, fontFamily: "'Playfair Display', serif" }}>Important Deadline Alerts</strong>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upcomingDeadlines.map(job => {
                    const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={job._id} style={{ fontSize: 14, color: "#4a5568", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "10px 14px", borderRadius: 8 }}>
                        <span><strong>{job.title}</strong> at {job.company}</span>
                        <span style={{ color: "#e53e3e", fontWeight: 700, background: "#fed7d7", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>
                          {daysLeft} {daysLeft === 1 ? "day" : "days"} left!
                        </span>
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => setActiveTab('jobs')} style={{ background: "#c53030", color: "white", border: "none", fontWeight: 600, padding: "8px 16px", borderRadius: 8, marginTop: 14, cursor: "pointer", fontSize: 13 }}>
                  Apply Now →
                </button>
              </div>
            )}

            {/* Skills & Certifications preview */}
            {user.profile?.skills?.length > 0 && (
              <div style={styles.profilePreview}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <strong style={{ fontSize: 16 }}>Your Skill Profile</strong>
                  <button style={styles.btnSmall} onClick={() => setActiveTab("profile")}>Edit Profile →</button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {user.profile.skills.map(s => <span key={s} style={styles.skillChip}>{s}</span>)}
                </div>
                {user.profile.certifications?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={styles.subLabel}>Certifications</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {user.profile.certifications.map(c => <span key={c} style={styles.certChip}>🏅 {c}</span>)}
                    </div>
                  </div>
                )}
                {user.profile?.resumeUrl && (
                  <div style={{ marginTop: 12 }}>
                    <a href={`http://localhost:5000${user.profile.resumeUrl}`} target="_blank" rel="noreferrer" style={styles.resumeLink}>📄 View Uploaded Resume</a>
                  </div>
                )}
              </div>
            )}

            {!user.profile?.skills?.length && (
              <div style={styles.banner}>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>🚀 Complete Your Smart Profile!</h3>
                <p style={{ fontSize: 14, opacity: 0.9 }}>Add your CGPA, skills, and certifications so companies can find and shortlist you directly.</p>
                <button style={styles.bannerBtn} onClick={() => setActiveTab("profile")}>Update Profile →</button>
              </div>
            )}

            {applications.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h2 style={styles.sectionTitle}>Recent Activity</h2>
                <div style={styles.recentList}>
                  {applications.slice(0, 3).map((app, i) => {
                    const sc = statusColor(app.status);
                    return (
                      <div key={i} style={styles.recentItem}>
                        <div><strong>{app.title}</strong><span style={{ color: "#718096", marginLeft: 8 }}>@ {app.company}</span></div>
                        <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>{app.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── RESUME ─── */}
        {activeTab === "resume" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>My Resume</h2>
            <div style={styles.profileForm}>
              <p style={{ color: "#718096", marginBottom: 20, fontSize: 14 }}>
                Upload your resume in PDF format. This will be visible to coordinators and interviewers when they view your profile.
              </p>
              <div style={{ padding: "30px", border: "2px dashed #e2e8f0", borderRadius: 12, textAlign: "center", background: "#f8f9fa" }}>
                <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} style={{ marginBottom: 20 }} />
                {resumeFile && <p style={{ fontSize: 13, marginBottom: 15 }}>Selected: <strong>{resumeFile.name}</strong></p>}
                <button onClick={handleResumeUpload} style={{ ...styles.btnSubmit, width: "auto" }} disabled={uploadingResume}>
                  {uploadingResume ? "Uploading..." : "Click to Upload Resume"}
                </button>
              </div>

              {user.profile?.resumeUrl && (
                <div style={{ marginTop: 30 }}>
                  <div style={{ padding: 20, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>Currently Uploaded Resume</strong>
                      <p style={{ fontSize: 12, color: "#a0aec0" }}>Ready for applications and AI scan</p>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <a href={`http://localhost:5000${user.profile.resumeUrl}`} target="_blank" rel="noreferrer" style={{ ...styles.btnSmall, textDecoration: "none" }}>View File</a>
                      <button style={{ background: "#2b6cb0", color: "white", padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }} onClick={handleAnalyzeResume} disabled={analyzingResume}>
                        {analyzingResume ? "Scanning..." : "🤖 AI ATS Checker"}
                      </button>
                    </div>
                  </div>

                  {/* AI Output Box */}
                  {aiAnalysis && (
                    <div style={{ marginTop: 20, animation: "fadeIn 0.5s ease-in", border: "1px solid #d6bcfa", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ background: "#f5f3ff", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #d6bcfa" }}>
                        <h3 style={{ fontSize: 16, color: "#553c9a", margin: 0, fontWeight: 700 }}>AI Resume Analytics</h3>
                        <div style={{ background: aiAnalysis.score >= 80 ? "#c6f6d5" : aiAnalysis.score >= 50 ? "#fefcbf" : "#fed7d7", color: aiAnalysis.score >= 80 ? "#276749" : aiAnalysis.score >= 50 ? "#744210" : "#c53030", padding: "4px 12px", borderRadius: 20, fontWeight: 800, fontSize: 14 }}>
                          ATS Score: {aiAnalysis.score}/100
                        </div>
                      </div>

                      <div style={{ padding: 24, background: "white" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                          <div>
                            <strong style={{ fontSize: 13, color: "#718096" }}>✅ DETECTED SECTIONS</strong>
                            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 14, color: "#276749" }}>
                              {aiAnalysis.foundSections.length ? aiAnalysis.foundSections.map(s => <li key={s} style={{ textTransform: "capitalize" }}>{s}</li>) : <li>None</li>}
                            </ul>

                            <strong style={{ fontSize: 13, color: "#718096", display: "block", marginTop: 16 }}>⚠️ MISSING SECTIONS</strong>
                            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 14, color: "#c53030" }}>
                              {aiAnalysis.missingSections.length ? aiAnalysis.missingSections.map(s => <li key={s} style={{ textTransform: "capitalize" }}>{s}</li>) : <li style={{ color: "green" }}>None! Perfect!</li>}
                            </ul>
                          </div>

                          <div>
                            <strong style={{ fontSize: 13, color: "#718096" }}>🛠️ EXTRACTED SKILLS</strong>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                              {aiAnalysis.extractedSkills.length ? aiAnalysis.extractedSkills.map(s => (
                                <span key={s} style={{ background: "#edf2f7", fontSize: 11, padding: "3px 8px", borderRadius: 10, color: "#4a5568", fontWeight: 600, textTransform: "capitalize" }}>{s}</span>
                              )) : <span style={{ fontSize: 12, color: "#c53030" }}>No technical skills found.</span>}
                            </div>

                            <strong style={{ fontSize: 13, color: "#718096", display: "block", marginTop: 20 }}>💡 TIPS FOR ATS</strong>
                            <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 13, color: "#2b6cb0", lineHeight: 1.6 }}>
                              {aiAnalysis.atsFormatTips.length ? aiAnalysis.atsFormatTips.map((tip, i) => <li key={i} style={{ marginBottom: 4 }}>{tip}</li>) : <li style={{ color: "green" }}>Your resume format looks strongly compatible with ATS!</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── FEEDBACK ─── */}
        {activeTab === "feedback" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>My AI & Company Feedback</h2>
            <p style={{ color: "#718096", marginBottom: 24, fontSize: 14 }}>
              Insights on why your profile was missed or feedback from your recent interviews. Use this to improve your skills!
            </p>

            {loadingFeedback ? <div style={styles.loading}>Loading feedback...</div> : feedbacks.length === 0 ? (
              <div style={styles.emptyState}>No feedback records yet. Keep applying!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {feedbacks.map(f => (
                  <div key={f._id} style={{ ...styles.jobCard, borderLeft: f.type === 'pre_filter' ? '4px solid #8b5cf6' : '4px solid #f56565' }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <strong style={{ fontSize: 16 }}>{f.company} — {f.jobTitle}</strong>
                      <span style={{ fontSize: 11, color: "#a0aec0" }}>{new Date(f.sentAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ background: "#f8f9fa", padding: 15, borderRadius: 10, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#4a5568" }}>
                      {f.message}
                    </div>
                    {f.missingSkills?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#718096" }}>RECOMMENDED SKILLS TO LEARN:</span>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {f.missingSkills.map(s => <span key={s} style={{ ...styles.skillChip, background: "#f5f3ff", color: "#6c3fc5" }}>{s}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MY PROFILE ─── */}
        {activeTab === "profile" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>My Smart Profile</h2>
            <p style={{ color: "#718096", marginBottom: 24, fontSize: 14 }}>
              Your profile is visible to interviewers and coordinators. Rich profiles get discovered and shortlisted faster.
            </p>
            <form onSubmit={handleSaveProfile} style={styles.profileForm}>
              <div style={styles.formGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>CGPA (out of 10)</label>
                  <input style={styles.input} type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.75" value={profile.cgpa} onChange={e => setProfile({ ...profile, cgpa: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Branch / Department</label>
                  <input style={styles.input} placeholder="e.g. Computer Science" value={profile.branch} onChange={e => setProfile({ ...profile, branch: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Batch / Graduation Year</label>
                  <input style={styles.input} placeholder="e.g. 2026" value={profile.batch} onChange={e => setProfile({ ...profile, batch: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Skills <span style={styles.hint2}>(comma separated)</span></label>
                  <input style={styles.input} placeholder="React, Node.js, Python" value={profile.skills} onChange={e => setProfile({ ...profile, skills: e.target.value })} />
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: "span 2" }}>
                  <label style={styles.label}>Certifications <span style={styles.hint2}>(comma separated)</span></label>
                  <input style={styles.input} placeholder="AWS Cloud Practitioner, Google Data Analytics" value={profile.certifications} onChange={e => setProfile({ ...profile, certifications: e.target.value })} />
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: "span 2" }}>
                  <label style={styles.label}>About Me</label>
                  <textarea style={{ ...styles.input, height: 80, resize: "vertical" }} placeholder="Brief description of your strengths and goals..." value={profile.about} onChange={e => setProfile({ ...profile, about: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🐙 GitHub URL</label>
                  <input style={styles.input} placeholder="https://github.com/username" value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>🧩 LeetCode URL</label>
                  <input style={styles.input} placeholder="https://leetcode.com/username" value={profile.leetcode} onChange={e => setProfile({ ...profile, leetcode: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>💼 LinkedIn URL</label>
                  <input style={styles.input} placeholder="https://linkedin.com/in/username" value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} />
                </div>
              </div>
              <button type="submit" style={{ ...styles.btnSubmit, opacity: savingProfile ? 0.7 : 1 }} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "💾 Save Profile"}
              </button>
            </form>
          </div>
        )}

        {/* ─── JOB BOARD ─── */}
        {activeTab === "jobs" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>Available Jobs</h2>
            {loadingJobs ? <div style={styles.loading}>Loading jobs...</div> : jobs.length === 0 ? (
              <div style={styles.emptyState}>No jobs posted yet. Check back soon!</div>
            ) : (
              <div style={styles.jobList}>
                {jobs.map(job => (
                  <div key={job._id} style={styles.jobCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={styles.jobRole}>{job.title}</h3>
                        <p style={styles.jobCompany}>{job.company} &bull; {job.type}</p>
                        {job.description && <p style={{ fontSize: 13, color: "#718096", marginTop: 6 }}>{job.description}</p>}
                      </div>
                      {job.package && <div style={styles.packageBadge}>{job.package}</div>}
                    </div>
                    {job.skills?.length > 0 && (
                      <div style={styles.tagContainer}>
                        {job.skills.map(tag => <span key={tag} style={styles.tag}>{tag}</span>)}
                      </div>
                    )}
                    {job.deadline && (() => {
                      const daysLeft = (new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24);
                      const isClosingSoon = daysLeft > 0 && daysLeft <= 3.5;
                      return (
                        <p style={{ fontSize: 13, fontWeight: 600, color: isClosingSoon ? "#e53e3e" : "#4a5568", marginTop: 12 }}>
                          ⏰ Deadline: {new Date(job.deadline).toLocaleDateString()}
                          {isClosingSoon && <span style={{ background: "#fed7d7", marginLeft: 8, padding: "3px 10px", borderRadius: 12, fontSize: 11, color: "#c53030" }}>Closing Soon</span>}
                        </p>
                      );
                    })()}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                      <button style={{ ...styles.btnApply, opacity: applyingId === job._id ? 0.6 : 1 }} onClick={() => handleApply(job._id)} disabled={applyingId === job._id}>
                        {applyingId === job._id ? "Applying..." : "Apply Now"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MY APPLICATIONS ─── */}
        {activeTab === "applications" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>My Applications</h2>
            {loadingApps ? <div style={styles.loading}>Fetching your applications...</div> : applications.length === 0 ? (
              <div style={styles.emptyState}>You haven't applied to any jobs yet.</div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={styles.th}>Job / Company</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Feedback</th>
                      <th style={styles.th}>Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, i) => {
                      const sc = statusColor(app.status);
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                          <td style={styles.td}><strong>{app.title}</strong><div style={{ fontSize: 12, color: "#a0aec0" }}>{app.company}</div></td>
                          <td style={styles.td}>{app.type}</td>
                          <td style={styles.td}><span style={{ ...styles.statusBadge, background: sc.bg, color: sc.color }}>{app.status}</span></td>
                          <td style={{ ...styles.td, fontSize: 13, color: "#4a5568" }}>{app.feedback || <span style={{ color: "#cbd5e0" }}>No feedback yet</span>}</td>
                          <td style={{ ...styles.td, fontSize: 12, color: "#a0aec0" }}>{new Date(app.appliedAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "'DM Sans', sans-serif" },
  mainContent: { marginLeft: 260, padding: "40px", flex: 1 },
  header: { marginBottom: 30 },
  greeting: { fontSize: 28, fontWeight: 700, color: "#2d3748", marginBottom: 6, fontFamily: "'Playfair Display', serif" },
  subtitle: { fontSize: 15, color: "#718096" },
  fadeAnim: { animation: "fadeIn 0.3s ease-in" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 18, marginBottom: 24 },
  statCard: { display: "flex", alignItems: "center", gap: 14, padding: "20px", background: "white", borderRadius: 14, border: "1px solid #edf2f7", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  statIcon: { fontSize: 24, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f3ff", borderRadius: "50%" },
  statLabel: { fontSize: 12, color: "#718096", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 24, fontWeight: 700, color: "#2d3748" },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#2d3748" },
  banner: { background: "linear-gradient(135deg, #3d1a78 0%, #8b5cf6 100%)", borderRadius: 14, padding: "28px", color: "white", marginTop: 20, boxShadow: "0 10px 25px -5px rgba(108,63,197,0.3)" },
  bannerBtn: { marginTop: 14, background: "white", color: "#6c3fc5", border: "none", padding: "10px 22px", borderRadius: 8, fontWeight: 700, cursor: "pointer" },
  profilePreview: { background: "white", padding: "22px", borderRadius: 14, border: "1px solid #e2e8f0", marginTop: 6 },
  skillChip: { background: "#f5f3ff", color: "#6c3fc5", fontSize: 13, padding: "4px 12px", borderRadius: 20, fontWeight: 600 },
  certChip: { background: "#fefcbf", color: "#744210", fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 500 },
  subLabel: { fontSize: 12, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 },
  btnSmall: { background: "transparent", border: "1px solid #6c3fc5", color: "#6c3fc5", padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 },
  profileForm: { background: "white", borderRadius: 16, padding: "30px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#4a5568" },
  hint2: { fontSize: 11, color: "#a0aec0", fontWeight: 400 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" },
  btnSubmit: { background: "#3d1a78", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 15 },
  jobList: { display: "flex", flexDirection: "column", gap: 16 },
  jobCard: { background: "white", padding: "24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  jobRole: { fontSize: 18, fontWeight: 700, color: "#2d3748", marginBottom: 4 },
  jobCompany: { fontSize: 14, color: "#718096" },
  packageBadge: { fontSize: 13, fontWeight: 700, color: "#6c3fc5", background: "#f5f3ff", padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" },
  tagContainer: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  tag: { background: "#f1f5f9", color: "#475569", fontSize: 12, padding: "4px 12px", borderRadius: 6, fontWeight: 500 },
  btnApply: { background: "#3d1a78", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer" },
  tableContainer: { background: "white", borderRadius: 14, padding: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  th: { padding: "14px 16px", color: "#a0aec0", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "14px 16px", fontSize: 14 },
  statusBadge: { padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  loading: { textAlign: "center", padding: 40, color: "#a0aec0", fontSize: 15 },
  emptyState: { textAlign: "center", padding: "50px 20px", color: "#a0aec0", border: "2px dashed #e2e8f0", borderRadius: 12, background: "white" },
  recentList: { display: "flex", flexDirection: "column", gap: 10 },
  recentItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "white", borderRadius: 12, border: "1px solid #e2e8f0" },
};
