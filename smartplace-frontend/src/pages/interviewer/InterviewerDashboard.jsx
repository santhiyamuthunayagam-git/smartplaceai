import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Sidebar";
import API from "../../axios";
import { toast } from "react-toastify";

export default function InterviewerDashboard() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [user, setUser] = useState({});
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", company: "", type: "Full Time", package: "", description: "", skills: "", deadline: "" });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await API.get("/jobs");
      setJobs(res.data.jobs);
      if (res.data.jobs.length > 0 && !selectedJob) setSelectedJob(res.data.jobs[0]);
    } catch {
      toast.error("Failed to load jobs.");
    }
  }, [selectedJob]);

  const fetchApplicants = useCallback(async () => {
    if (!selectedJob) return;
    setLoadingApps(true);
    try {
      const res = await API.get(`/jobs/${selectedJob._id}/applicants`);
      setApplicants(res.data.applicants);
    } catch {
      toast.error("Failed to load applicants.");
    } finally {
      setLoadingApps(false);
    }
  }, [selectedJob]);

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => { if (activeTab === "pipeline") fetchApplicants(); }, [activeTab, selectedJob, fetchApplicants]);

  const updateStatus = async (studentId, status, feedback = "") => {
    try {
      await API.patch(`/jobs/${selectedJob._id}/applicants/${studentId}`, { status, feedback });
      toast.success(`Status updated to ${status}`);
      fetchApplicants();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const payload = { ...newJob, skills: newJob.skills.split(",").map(s => s.trim()).filter(Boolean) };
      await API.post("/jobs", payload);
      toast.success("Job posted successfully!");
      setShowJobForm(false);
      setNewJob({ title: "", company: "", type: "Full Time", package: "", description: "", skills: "", deadline: "" });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post job.");
    } finally {
      setPosting(false);
    }
  };

  const tabs = [
    { key: "pipeline", label: "Applicant Pipeline", icon: "📋" },
    { key: "postings", label: "Post a Job", icon: "💼" },
  ];

  const columns = ["Applied", "Shortlisted", "Interviewed", "Selected", "Rejected"];

  const columnColors = {
    Applied: "#edf2f7", Shortlisted: "#e6fffa", Interviewed: "#ebf8ff",
    Selected: "#f0fff4", Rejected: "#fff5f5"
  };
  const columnHeaderColors = {
    Applied: "#4a5568", Shortlisted: "#2c7a7b", Interviewed: "#2b6cb0",
    Selected: "#276749", Rejected: "#c53030"
  };

  return (
    <div style={styles.container}>
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} role="interviewer" />

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Interviewer Portal</h1>
            <p style={styles.subtitle}>Manage applicants and post new job openings.</p>
          </div>
        </div>

        {/* PIPELINE TAB */}
        {activeTab === "pipeline" && (
          <div style={styles.fadeAnim}>
            {/* Job Selector */}
            {jobs.length > 0 && (
              <div style={styles.jobSelector}>
                <label style={styles.selectorLabel}>Viewing applicants for:</label>
                <select
                  style={styles.select}
                  value={selectedJob?._id || ""}
                  onChange={e => setSelectedJob(jobs.find(j => j._id === e.target.value))}
                >
                  {jobs.map(j => <option key={j._id} value={j._id}>{j.title} — {j.company}</option>)}
                </select>
              </div>
            )}

            {jobs.length === 0 ? (
              <div style={styles.emptyState}>No jobs posted yet. Go to "Post a Job" to add one.</div>
            ) : loadingApps ? (
              <div style={styles.loading}>Loading applicants...</div>
            ) : (
              <div style={styles.board}>
                {columns.map(col => {
                  const colApplicants = applicants.filter(a => a.status === col);
                  return (
                    <div key={col} style={{ ...styles.column, background: columnColors[col] }}>
                      <h3 style={{ ...styles.columnHeader, color: columnHeaderColors[col] }}>
                        {col} <span style={styles.countBadge}>{colApplicants.length}</span>
                      </h3>
                      {colApplicants.length === 0 && (
                        <div style={styles.emptyCard}>No candidates</div>
                      )}
                      {colApplicants.map(app => (
                        <div key={app._id} style={styles.card}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <strong style={{ fontSize: 14, color: "#2d3748" }}>
                              {app.student?.name || "Unknown"}
                            </strong>
                          </div>
                          <p style={{ fontSize: 12, color: "#718096", margin: "4px 0 10px" }}>
                            {app.student?.email}
                          </p>
                          <div style={styles.actionRow}>
                            {["Shortlisted", "Interviewed", "Selected", "Rejected"].filter(s => s !== col).map(status => (
                              <button
                                key={status}
                                style={{ ...styles.miniBtn, background: status === "Rejected" ? "#fff5f5" : "#f0fff4", color: status === "Rejected" ? "#c53030" : "#276749" }}
                                onClick={() => updateStatus(app.student?._id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                          <input
                            style={styles.feedbackInput}
                            placeholder="Add feedback..."
                            onBlur={e => { if (e.target.value) updateStatus(app.student?._id, col, e.target.value); }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* POST JOB TAB */}
        {activeTab === "postings" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>Post a New Job Opening</h2>
            <div style={styles.formCard}>
              <form onSubmit={handlePostJob}>
                <div style={styles.formGrid}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Job Title *</label>
                    <input style={styles.input} placeholder="e.g. Software Engineer" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} required />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Company Name *</label>
                    <input style={styles.input} placeholder="e.g. Google" value={newJob.company} onChange={e => setNewJob({ ...newJob, company: e.target.value })} required />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Job Type</label>
                    <select style={styles.input} value={newJob.type} onChange={e => setNewJob({ ...newJob, type: e.target.value })}>
                      <option>Full Time</option>
                      <option>Internship</option>
                      <option>Contract</option>
                    </select>
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Package / Stipend</label>
                    <input style={styles.input} placeholder="e.g. 12 LPA or ₹40,000/month" value={newJob.package} onChange={e => setNewJob({ ...newJob, package: e.target.value })} />
                  </div>
                  <div style={{ ...styles.fieldGroup, gridColumn: "span 2" }}>
                    <label style={styles.label}>Description</label>
                    <textarea style={{ ...styles.input, height: 80, resize: "vertical" }} placeholder="Job description..." value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} />
                  </div>
                  <div style={{ ...styles.fieldGroup, gridColumn: "span 2" }}>
                    <label style={styles.label}>Required Skills (comma separated)</label>
                    <input style={styles.input} placeholder="e.g. React, Node.js, MongoDB" value={newJob.skills} onChange={e => setNewJob({ ...newJob, skills: e.target.value })} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Application Deadline</label>
                    <input style={styles.input} type="date" value={newJob.deadline} onChange={e => setNewJob({ ...newJob, deadline: e.target.value })} />
                  </div>
                </div>
                <button type="submit" style={{ ...styles.btnSubmit, opacity: posting ? 0.7 : 1 }} disabled={posting}>
                  {posting ? "Posting..." : "🚀 Post Job"}
                </button>
              </form>
            </div>

            {/* Posted Jobs List */}
            <h2 style={{ ...styles.sectionTitle, marginTop: 30 }}>Your Posted Jobs ({jobs.length})</h2>
            {jobs.length === 0 ? (
              <div style={styles.emptyState}>No jobs posted yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map(job => (
                  <div key={job._id} style={styles.postedJobCard}>
                    <div>
                      <strong style={{ fontSize: 16, color: "#2d3748" }}>{job.title}</strong>
                      <span style={{ color: "#718096", marginLeft: 10 }}>@ {job.company}</span>
                      <span style={styles.typeBadge}>{job.type}</span>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {job.skills?.map(s => <span key={s} style={styles.miniTag}>{s}</span>)}
                    </div>
                  </div>
                ))}
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 700, color: "#2d3748", fontFamily: "'Playfair Display', serif" },
  subtitle: { fontSize: 15, color: "#718096", marginTop: 4 },
  fadeAnim: { animation: "fadeIn 0.3s ease-in" },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#2d3748" },
  jobSelector: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24, background: "white", padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0" },
  selectorLabel: { fontSize: 14, fontWeight: 600, color: "#4a5568", whiteSpace: "nowrap" },
  select: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" },
  board: { display: "flex", gap: 16, overflowX: "auto", paddingBottom: 10 },
  column: { flex: 1, minWidth: 220, borderRadius: 12, padding: "16px" },
  columnHeader: { fontSize: 12, textTransform: "uppercase", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },
  countBadge: { background: "rgba(0,0,0,0.08)", borderRadius: 20, padding: "2px 8px", fontSize: 11 },
  card: { background: "white", padding: "14px", borderRadius: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.05)", marginBottom: 10 },
  emptyCard: { border: "2px dashed #cbd5e0", padding: "16px", borderRadius: 8, textAlign: "center", color: "#a0aec0", fontSize: 12 },
  actionRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  miniBtn: { fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer" },
  feedbackInput: { width: "100%", fontSize: 11, padding: "6px 10px", borderRadius: 6, border: "1px dashed #e2e8f0", outline: "none", boxSizing: "border-box", color: "#4a5568" },
  formCard: { background: "white", borderRadius: 16, padding: "30px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#4a5568" },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  btnSubmit: { background: "#3d1a78", color: "white", border: "none", padding: "12px 28px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 15 },
  postedJobCard: { background: "white", padding: "18px 24px", borderRadius: 12, border: "1px solid #e2e8f0" },
  typeBadge: { marginLeft: 10, background: "#f5f3ff", color: "#6c3fc5", fontSize: 11, padding: "2px 10px", borderRadius: 10, fontWeight: 600 },
  miniTag: { background: "#f1f5f9", color: "#475569", fontSize: 11, padding: "2px 8px", borderRadius: 4 },
  loading: { textAlign: "center", padding: 40, color: "#a0aec0", fontSize: 15 },
  emptyState: { textAlign: "center", padding: "40px 20px", color: "#a0aec0", border: "2px dashed #e2e8f0", borderRadius: 12, background: "white" },
};
