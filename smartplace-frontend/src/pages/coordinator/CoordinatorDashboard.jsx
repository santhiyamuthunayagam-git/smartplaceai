import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Sidebar";
import API from "../../axios";
import { toast } from "react-toastify";

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [students, setStudents] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // Filters
  const [filterCgpa, setFilterCgpa] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterBranch, setFilterBranch] = useState("");

  // Company form
  const [companyForm, setCompanyForm] = useState({ name: "", industry: "", website: "", description: "" });
  const [savingCompany, setSavingCompany] = useState(false);

  // Smart Filter
  const [sfJobId, setSfJobId] = useState("");
  const [sfSkills, setSfSkills] = useState("");
  const [sfMinCgpa, setSfMinCgpa] = useState("");
  const [sfCompany, setSfCompany] = useState("");
  const [sfTitle, setSfTitle] = useState("");
  const [sfResults, setSfResults] = useState(null);
  const [sfLoading, setSfLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const tabs = [
    { key: "overview",     label: "Analytics",       icon: "📈" },
    { key: "smart-filter", label: "Smart Filter",    icon: "🤖" },
    { key: "companies",    label: "Companies",       icon: "🏢" },
    { key: "students",     label: "All Students",    icon: "👨‍🎓" },
    { key: "interviewers", label: "Interviewers",    icon: "💼" },
    { key: "jobs",         label: "All Jobs",        icon: "📋" },
  ];

  const fetchStudents = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const res = await API.get("/user/students", { params: filters });
      setStudents(res.data.students);
    } catch { toast.error("Failed to load students."); }
    finally { setLoading(false); }
  }, []);

  const fetchInterviewers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/user/interviewers");
      setInterviewers(res.data.interviewers);
    } catch { toast.error("Failed to load interviewers."); }
    finally { setLoading(false); }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/jobs");
      setJobs(res.data.jobs);
    } catch { toast.error("Failed to load jobs."); }
    finally { setLoading(false); }
  }, []);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/coordinator/companies");
      setCompanies(res.data.companies);
    } catch { toast.error("Failed to load companies."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "overview") { fetchStudents(); fetchInterviewers(); fetchJobs(); fetchCompanies(); }
    if (activeTab === "students") fetchStudents({ minCgpa: filterCgpa, skill: filterSkill, branch: filterBranch });
    if (activeTab === "interviewers") fetchInterviewers();
    if (activeTab === "jobs") fetchJobs();
    if (activeTab === "companies") fetchCompanies();
    if (activeTab === "smart-filter") fetchJobs();
  }, [activeTab]);

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      await API.post("/coordinator/companies", companyForm);
      toast.success("Company added successfully!");
      setCompanyForm({ name: "", industry: "", website: "", description: "" });
      fetchCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add company.");
    } finally { setSavingCompany(false); }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm("Remove this company?")) return;
    try {
      await API.delete(`/coordinator/companies/${id}`);
      toast.success("Company removed.");
      fetchCompanies();
    } catch { toast.error("Failed to remove."); }
  };

  const handleSmartFilter = async () => {
    if (!sfSkills && !sfJobId) return toast.warning("Please enter required skills or select a job.");
    setSfLoading(true);
    setSfResults(null);
    try {
      const requiredSkills = sfSkills ? sfSkills.split(",").map(s => s.trim()).filter(Boolean) : [];
      const res = await API.post("/coordinator/smart-filter", {
        jobId: sfJobId || undefined,
        requiredSkills,
        minCgpa: parseFloat(sfMinCgpa) || 0,
        company: sfCompany || "Company",
        jobTitle: sfTitle || "Job Opening"
      });
      setSfResults(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Smart filter failed.");
    } finally { setSfLoading(false); }
  };

  const handleDispatchFeedback = async () => {
    if (!sfResults?.notEligible?.length) return toast.info("No not-eligible students to notify.");
    setDispatching(true);
    try {
      const students = sfResults.notEligible.map(s => ({
        studentId: s._id,
        missingSkills: s.missingSkills,
        cgpaGap: s.cgpaGap,
        feedbackMessage: s.feedbackMessage
      }));
      const res = await API.post("/coordinator/dispatch-feedback", {
        students,
        company: sfCompany || "Company",
        jobTitle: sfTitle || "Job Opening",
        jobId: sfJobId || undefined
      });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Dispatch failed.");
    } finally { setDispatching(false); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await API.get("/coordinator/export/students", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartplace_students.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV exported successfully!");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportingCsv(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post("/coordinator/import/students", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || "Import successful!");
      fetchStudents({ minCgpa: filterCgpa, skill: filterSkill, branch: filterBranch });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to import CSV.");
    } finally {
      setImportingCsv(false);
      e.target.value = null; // reset input
    }
  };

  const statsCards = [
    { label: "Registered Students", value: students.length, icon: "👨‍🎓", color: "#e9d8fd" },
    { label: "Active Interviewers", value: interviewers.length, icon: "💼", color: "#bee3f8" },
    { label: "Companies",           value: companies.length, icon: "🏢", color: "#fefcbf" },
    { label: "Job Postings",        value: jobs.length, icon: "📋", color: "#c6f6d5" },
  ];

  return (
    <div style={styles.container}>
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} role="coordinator" />

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div style={styles.modalOverlay} onClick={() => setSelectedStudent(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalAvatar}>{selectedStudent.name.charAt(0)}</div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedStudent.name}</h2>
                <p style={{ color: "#718096", fontSize: 13 }}>{selectedStudent.email}</p>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedStudent(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.profileRow}>
                <div style={styles.profileField}><span style={styles.pLabel}>Branch</span><span style={styles.pValue}>{selectedStudent.profile?.branch || "—"}</span></div>
                <div style={styles.profileField}><span style={styles.pLabel}>Batch</span><span style={styles.pValue}>{selectedStudent.profile?.batch || "—"}</span></div>
                <div style={styles.profileField}><span style={styles.pLabel}>CGPA</span><span style={{ ...styles.pValue, color: "#6c3fc5", fontWeight: 800, fontSize: 22 }}>{selectedStudent.profile?.cgpa || "—"}</span></div>
              </div>
              {selectedStudent.profile?.about && <p style={styles.aboutText}>{selectedStudent.profile.about}</p>}
              {selectedStudent.profile?.skills?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={styles.pLabel}>Skills</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {selectedStudent.profile.skills.map(s => <span key={s} style={styles.skillChip}>{s}</span>)}
                  </div>
                </div>
              )}
              {selectedStudent.profile?.certifications?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={styles.pLabel}>Certifications</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {selectedStudent.profile.certifications.map(c => <span key={c} style={styles.certChip}>🏅 {c}</span>)}
                  </div>
                </div>
              )}
              <div style={styles.linksRow}>
                {selectedStudent.profile?.github && <a style={styles.link} href={selectedStudent.profile.github} target="_blank" rel="noreferrer">🐙 GitHub</a>}
                {selectedStudent.profile?.leetcode && <a style={styles.link} href={selectedStudent.profile.leetcode} target="_blank" rel="noreferrer">🧩 LeetCode</a>}
                {selectedStudent.profile?.linkedin && <a style={styles.link} href={selectedStudent.profile.linkedin} target="_blank" rel="noreferrer">💼 LinkedIn</a>}
                {selectedStudent.profile?.resumeUrl && <a style={styles.link} href={`http://localhost:5000${selectedStudent.profile.resumeUrl}`} target="_blank" rel="noreferrer">📄 Resume</a>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Placement Command Center</h1>
            <p style={styles.subtitle}>Manage placement drives, filter students, and dispatch AI feedback</p>
          </div>
          <button style={styles.btnBroadcast} onClick={() => toast.info("Broadcast feature coming soon!")}>🔔 Broadcast</button>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (
          <div style={styles.fadeAnim}>
            <div style={styles.statsGrid}>
              {statsCards.map((c, i) => (
                <div key={i} style={styles.statCard}>
                  <div style={{ ...styles.statIcon, background: c.color }}>{c.icon}</div>
                  <div><div style={styles.statLabel}>{c.label}</div><div style={styles.statValue}>{loading ? "..." : c.value}</div></div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
              <div style={{ ...styles.card, flex: 2 }}>
                <h3 style={styles.cardTitle}>System Status</h3>
                <div style={styles.alertItem}><span style={{ ...styles.badge, background: "#c6f6d5", color: "#276749" }}>LIVE</span> Backend API + MongoDB connected on <strong>localhost:5000</strong></div>
                <div style={styles.alertItem}><span style={{ ...styles.badge, background: "#bee3f8", color: "#2b6cb0" }}>INFO</span> {students.length} students · {interviewers.length} interviewers · {jobs.length} jobs · {companies.length} companies</div>
                <div style={styles.alertItem}><span style={{ ...styles.badge, background: "#fefcbf", color: "#744210" }}>NEW</span> <strong>Smart AI Filter</strong> is ready — go to the Smart Filter tab to match students to jobs.</div>
              </div>
              <div style={{ ...styles.card, flex: 1 }}>
                <h3 style={styles.cardTitle}>Quick Actions</h3>
                <button style={styles.actionBtn} onClick={() => setActiveTab("smart-filter")}>🤖 Smart Filter Students</button>
                <button style={styles.actionBtn} onClick={() => setActiveTab("companies")}>🏢 Manage Companies</button>
                <button style={styles.actionBtn} onClick={() => setActiveTab("students")}>👨‍🎓 Browse Students</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SMART FILTER ═══ */}
        {activeTab === "smart-filter" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>🤖 AI Smart Student Filter</h2>
            <p style={{ color: "#718096", marginBottom: 24, fontSize: 14 }}>
              Enter a job's requirements OR select an existing job. The system will compare each student's skills and CGPA and generate personalised AI feedback for students who don't qualify.
            </p>

            <div style={styles.filterCard}>
              <div style={styles.formGrid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Select Existing Job (optional)</label>
                  <select style={styles.input} value={sfJobId} onChange={e => {
                    setSfJobId(e.target.value);
                    const job = jobs.find(j => j._id === e.target.value);
                    if (job) { setSfSkills(job.skills.join(", ")); setSfTitle(job.title); setSfCompany(job.company); }
                  }}>
                    <option value="">— Manual Entry —</option>
                    {jobs.map(j => <option key={j._id} value={j._id}>{j.title} @ {j.company}</option>)}
                  </select>
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Company Name</label>
                  <input style={styles.input} placeholder="e.g. Google" value={sfCompany} onChange={e => setSfCompany(e.target.value)} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Job Title</label>
                  <input style={styles.input} placeholder="e.g. Software Engineer" value={sfTitle} onChange={e => setSfTitle(e.target.value)} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Minimum CGPA</label>
                  <input style={styles.input} type="number" step="0.1" min="0" max="10" placeholder="e.g. 8.0" value={sfMinCgpa} onChange={e => setSfMinCgpa(e.target.value)} />
                </div>
                <div style={{ ...styles.fieldGroup, gridColumn: "span 2" }}>
                  <label style={styles.label}>Required Skills (comma separated)</label>
                  <input style={styles.input} placeholder="React, Node.js, Python" value={sfSkills} onChange={e => setSfSkills(e.target.value)} />
                </div>
              </div>
              <button style={{ ...styles.btnPrimary, opacity: sfLoading ? 0.7 : 1 }} onClick={handleSmartFilter} disabled={sfLoading}>
                {sfLoading ? "Analysing students..." : "🔍 Run Smart Filter"}
              </button>
            </div>

            {sfResults && (
              <div style={{ marginTop: 30 }}>
                {/* Summary Banner */}
                <div style={styles.sfSummary}>
                  <div style={styles.sfStat}><span style={{ fontSize: 28, fontWeight: 700, color: "#276749" }}>{sfResults.eligible.length}</span><br /><span style={{ fontSize: 12 }}>Eligible Students</span></div>
                  <div style={styles.sfDivider} />
                  <div style={styles.sfStat}><span style={{ fontSize: 28, fontWeight: 700, color: "#c53030" }}>{sfResults.notEligible.length}</span><br /><span style={{ fontSize: 12 }}>Not Qualified</span></div>
                  <div style={styles.sfDivider} />
                  <div style={styles.sfStat}><span style={{ fontSize: 28, fontWeight: 700, color: "#2d3748" }}>{sfResults.totalStudents}</span><br /><span style={{ fontSize: 12 }}>Total Scanned</span></div>
                  <button style={{ ...styles.btnDispatch, opacity: dispatching ? 0.7 : 1 }} onClick={handleDispatchFeedback} disabled={dispatching || sfResults.notEligible.length === 0}>
                    {dispatching ? "Dispatching..." : `📨 Dispatch AI Feedback to ${sfResults.notEligible.length} Students`}
                  </button>
                </div>

                {/* Eligible Students */}
                {sfResults.eligible.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ ...styles.sectionTitle, color: "#276749", fontSize: 18 }}>✅ Eligible Students ({sfResults.eligible.length})</h3>
                    <div style={styles.eligGrid}>
                      {sfResults.eligible.map(s => (
                        <div key={s._id} style={{ ...styles.studentCard, borderLeft: "4px solid #38a169", cursor: "pointer" }} onClick={() => setSelectedStudent(s)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <strong style={{ fontSize: 15, color: "#2d3748" }}>{s.name}</strong>
                              <p style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{s.email}</p>
                            </div>
                            <span style={styles.cgpaBadge}>{s.profile?.cgpa} CGPA</span>
                          </div>
                          {s.profile?.branch && <p style={{ fontSize: 12, color: "#4a5568", marginTop: 8 }}>📚 {s.profile.branch}</p>}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                            {s.profile?.skills?.slice(0, 3).map(sk => <span key={sk} style={styles.miniSkill}>{sk}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not Eligible Students */}
                {sfResults.notEligible.length > 0 && (
                  <div style={{ marginTop: 30 }}>
                    <h3 style={{ ...styles.sectionTitle, color: "#c53030", fontSize: 18 }}>❌ Not Qualified ({sfResults.notEligible.length}) — AI Feedback Ready</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {sfResults.notEligible.map(s => (
                        <div key={s._id} style={{ ...styles.studentCard, borderLeft: "4px solid #e53e3e", cursor: "pointer" }} onClick={() => setSelectedStudent(s)}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div>
                              <strong style={{ fontSize: 15, color: "#2d3748" }}>{s.name}</strong>
                              <span style={{ marginLeft: 10, fontSize: 11, background: "#fed7d7", color: "#c53030", padding: "2px 8px", borderRadius: 10 }}>{s.matchPercentage}% skill match</span>
                              <p style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>{s.email}</p>
                            </div>
                            {s.profile?.cgpa && <span style={{ ...styles.cgpaBadge, background: "#fff5f5", color: "#c53030" }}>{s.profile.cgpa} CGPA</span>}
                          </div>
                          {s.missingSkills.length > 0 && (
                            <div>
                              <span style={{ fontSize: 12, color: "#718096", fontWeight: 600 }}>Missing Skills: </span>
                              {s.missingSkills.map(sk => <span key={sk} style={{ ...styles.miniSkill, background: "#fff5f5", color: "#c53030", marginLeft: 4 }}>{sk}</span>)}
                            </div>
                          )}
                          {s.cgpaGap > 0 && <p style={{ fontSize: 12, color: "#c53030", marginTop: 6 }}>⚠️ CGPA gap: {s.cgpaGap} points below requirement</p>}
                          <div style={{ marginTop: 10, padding: "10px 14px", background: "#f8f9fa", borderRadius: 8, fontSize: 12, color: "#4a5568", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {s.feedbackMessage.substring(0, 200)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ COMPANIES ═══ */}
        {activeTab === "companies" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>Registered Companies</h2>
            <div style={styles.filterCard}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#2d3748" }}>+ Add New Company</h3>
              <form onSubmit={handleAddCompany} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Company Name *</label>
                  <input style={styles.input} placeholder="e.g. Google" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} required />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Industry</label>
                  <input style={styles.input} placeholder="e.g. Technology" value={companyForm.industry} onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Website</label>
                  <input style={styles.input} placeholder="https://company.com" value={companyForm.website} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Description</label>
                  <input style={styles.input} placeholder="Brief description..." value={companyForm.description} onChange={e => setCompanyForm({ ...companyForm, description: e.target.value })} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <button type="submit" style={{ ...styles.btnPrimary, opacity: savingCompany ? 0.7 : 1 }} disabled={savingCompany}>
                    {savingCompany ? "Adding..." : "🏢 Add Company"}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {companies.length === 0 ? <div style={styles.emptyState}>No companies added yet.</div>
                : companies.map(c => (
                <div key={c._id} style={styles.companyCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: 16, color: "#2d3748" }}>{c.name}</strong>
                      {c.industry && <p style={{ fontSize: 12, color: "#718096", marginTop: 2 }}>🏭 {c.industry}</p>}
                    </div>
                    <button style={styles.btnDel} onClick={() => handleDeleteCompany(c._id)}>✕</button>
                  </div>
                  {c.description && <p style={{ fontSize: 13, color: "#4a5568", marginTop: 8 }}>{c.description}</p>}
                  {c.website && <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6c3fc5", marginTop: 8, display: "block" }}>🌐 {c.website}</a>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STUDENTS ═══ */}
        {activeTab === "students" && (
          <div style={styles.fadeAnim}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Student Directory ({students.length})</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ ...styles.btnReset, background: "#f0fff4", borderColor: "#c6f6d5", color: "#276749", cursor: "pointer" }}>
                  {importingCsv ? "⏳ Importing..." : "📥 Import CSV"}
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCSV} disabled={importingCsv} />
                </label>
                <button style={{ ...styles.btnReset, background: "#ebf8ff", borderColor: "#bee3f8", color: "#2b6cb0" }} onClick={handleExportCSV}>
                  📤 Export CSV
                </button>
              </div>
            </div>
            
            <div style={styles.filterBar}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Min CGPA</label>
                <input style={styles.filterInput} type="number" step="0.1" min="0" max="10" placeholder="e.g. 8.0" value={filterCgpa} onChange={e => setFilterCgpa(e.target.value)} />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Skill</label>
                <input style={styles.filterInput} placeholder="e.g. React" value={filterSkill} onChange={e => setFilterSkill(e.target.value)} />
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Branch</label>
                <input style={styles.filterInput} placeholder="e.g. Computer Science" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} />
              </div>
              <button style={styles.btnFilter} onClick={() => fetchStudents({ minCgpa: filterCgpa, skill: filterSkill, branch: filterBranch })}>🔍 Filter</button>
              <button style={styles.btnReset} onClick={() => { setFilterCgpa(""); setFilterSkill(""); setFilterBranch(""); fetchStudents(); }}>Reset</button>
            </div>

            {loading ? <div style={styles.loading}>Loading...</div> : (
              <div style={styles.cardGrid}>
                {students.length === 0 ? <div style={styles.emptyState}>No students match the filters.</div>
                  : students.map(s => (
                  <div key={s._id} style={styles.studentCard} onClick={() => setSelectedStudent(s)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={styles.avatar}>{s.name.charAt(0)}</div>
                      <div>
                        <strong style={{ fontSize: 14, color: "#2d3748" }}>{s.name}</strong>
                        <p style={{ fontSize: 11, color: "#718096", marginTop: 2 }}>{s.email}</p>
                      </div>
                      {s.profile?.cgpa && <span style={styles.cgpaBadge}>{s.profile.cgpa}</span>}
                    </div>
                    {s.profile?.branch && <p style={{ fontSize: 12, color: "#4a5568", marginBottom: 8 }}>📚 {s.profile.branch} · {s.profile.batch}</p>}
                    {s.profile?.skills?.length > 0 && (
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {s.profile.skills.slice(0, 3).map(sk => <span key={sk} style={styles.miniSkill}>{sk}</span>)}
                        {s.profile.skills.length > 3 && <span style={styles.moreSkill}>+{s.profile.skills.length - 3}</span>}
                      </div>
                    )}
                    <p style={styles.viewProfile}>Click to view full profile →</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ INTERVIEWERS ═══ */}
        {activeTab === "interviewers" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>Interviewers ({interviewers.length})</h2>
            {loading ? <div style={styles.loading}>Loading...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {interviewers.length === 0 ? <div style={styles.emptyState}>No interviewers yet.</div>
                  : interviewers.map(iv => (
                  <div key={iv._id} style={styles.personCard}>
                    <div style={styles.avatar}>{iv.name.charAt(0)}</div>
                    <div><strong style={{ fontSize: 15 }}>{iv.name}</strong><p style={{ fontSize: 13, color: "#718096", marginTop: 2 }}>{iv.email}</p></div>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#718096" }}>Joined {new Date(iv.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ JOBS ═══ */}
        {activeTab === "jobs" && (
          <div style={styles.fadeAnim}>
            <h2 style={styles.sectionTitle}>All Job Postings ({jobs.length})</h2>
            {loading ? <div style={styles.loading}>Loading...</div> : (
              <div style={styles.tableWrapper}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                      <th style={styles.th}>Title</th><th style={styles.th}>Company</th><th style={styles.th}>Type</th>
                      <th style={styles.th}>Package</th><th style={styles.th}>Applicants</th><th style={styles.th}>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#a0aec0" }}>No jobs posted yet.</td></tr>
                      : jobs.map(j => (
                      <tr key={j._id} style={{ borderBottom: "1px solid #edf2f7" }}>
                        <td style={styles.td}><strong>{j.title}</strong></td>
                        <td style={styles.td}>{j.company}</td>
                        <td style={styles.td}><span style={styles.typeBadge}>{j.type}</span></td>
                        <td style={styles.td}>{j.package || "—"}</td>
                        <td style={styles.td}>{j.applicants?.length || 0}</td>
                        <td style={{ ...styles.td, fontSize: 12, color: j.deadline && new Date(j.deadline) < new Date() ? "#e53e3e" : "#a0aec0" }}>
                          {j.deadline ? new Date(j.deadline).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
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
  mainContent: { marginLeft: 260, padding: "36px", flex: 1 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 700, color: "#2d3748", fontFamily: "'Playfair Display', serif" },
  subtitle: { fontSize: 14, color: "#718096", marginTop: 4 },
  btnBroadcast: { background: "#2b6cb0", color: "white", padding: "9px 16px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 },
  fadeAnim: { animation: "fadeIn 0.3s ease-in" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 10 },
  statCard: { display: "flex", alignItems: "center", gap: 14, padding: "18px", background: "white", borderRadius: 14, border: "1px solid #edf2f7", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  statIcon: { fontSize: 22, width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" },
  statLabel: { fontSize: 12, color: "#718096", fontWeight: 600, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: 700, color: "#2d3748" },
  card: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#2d3748", marginBottom: 14 },
  alertItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13, color: "#4a5568" },
  badge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, flexShrink: 0 },
  actionBtn: { display: "block", width: "100%", padding: "10px", marginBottom: 10, background: "white", border: "1px solid #d6bcfa", color: "#553c9a", borderRadius: 8, fontWeight: 600, cursor: "pointer", textAlign: "left", fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: 700, marginBottom: 18, color: "#2d3748" },
  filterCard: { background: "white", padding: "24px", borderRadius: 14, border: "1px solid #e2e8f0", marginBottom: 6 },
  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 13, fontWeight: 600, color: "#4a5568" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  btnPrimary: { background: "#3d1a78", color: "white", border: "none", padding: "11px 24px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  btnDispatch: { marginLeft: "auto", background: "#2b6cb0", color: "white", border: "none", padding: "11px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 },
  sfSummary: { display: "flex", alignItems: "center", gap: 20, background: "white", padding: "20px 24px", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  sfStat: { textAlign: "center", minWidth: 90 },
  sfDivider: { width: 1, height: 50, background: "#e2e8f0" },
  eligGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 },
  filterBar: { display: "flex", alignItems: "flex-end", gap: 10, background: "white", padding: "16px 18px", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 18 },
  filterGroup: { display: "flex", flexDirection: "column", gap: 4 },
  filterLabel: { fontSize: 10, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: 0.5 },
  filterInput: { padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", width: 140 },
  btnFilter: { background: "#3d1a78", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", alignSelf: "flex-end", fontSize: 13 },
  btnReset: { background: "white", color: "#718096", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", alignSelf: "flex-end", fontSize: 13 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  studentCard: { background: "white", padding: "18px", borderRadius: 14, border: "1px solid #e2e8f0", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "#e9d8fd", color: "#6b46c1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 },
  cgpaBadge: { marginLeft: "auto", background: "#f0fff4", color: "#276749", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0 },
  miniSkill: { background: "#f5f3ff", color: "#6c3fc5", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500 },
  moreSkill: { background: "#edf2f7", color: "#718096", fontSize: 11, padding: "2px 8px", borderRadius: 20 },
  viewProfile: { fontSize: 11, color: "#a0aec0", marginTop: 10, fontStyle: "italic" },
  companyCard: { background: "white", padding: "18px", borderRadius: 12, border: "1px solid #e2e8f0" },
  btnDel: { background: "#fff5f5", border: "none", color: "#c53030", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, fontWeight: 700 },
  personCard: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "white", borderRadius: 12, border: "1px solid #e2e8f0" },
  tableWrapper: { background: "white", borderRadius: 14, padding: "18px", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" },
  th: { padding: "12px 14px", color: "#a0aec0", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { padding: "12px 14px", fontSize: 13 },
  typeBadge: { background: "#f5f3ff", color: "#6c3fc5", fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600 },
  loading: { textAlign: "center", padding: 40, color: "#a0aec0" },
  emptyState: { textAlign: "center", padding: "40px 20px", color: "#a0aec0", border: "2px dashed #e2e8f0", borderRadius: 12, background: "white", gridColumn: "span 3" },
  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "white", borderRadius: 20, padding: "28px", width: "95%", maxWidth: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #edf2f7" },
  modalAvatar: { width: 52, height: 52, borderRadius: "50%", background: "#e9d8fd", color: "#6b46c1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 },
  closeBtn: { marginLeft: "auto", background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#718096" },
  modalBody: {},
  profileRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 },
  profileField: { display: "flex", flexDirection: "column", gap: 4, background: "#f8f9fa", padding: "10px", borderRadius: 10 },
  pLabel: { fontSize: 10, color: "#a0aec0", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  pValue: { fontSize: 14, fontWeight: 600, color: "#2d3748" },
  aboutText: { fontSize: 13, color: "#4a5568", marginBottom: 14, lineHeight: 1.6 },
  skillChip: { background: "#f5f3ff", color: "#6c3fc5", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600 },
  certChip: { background: "#fefcbf", color: "#744210", fontSize: 11, padding: "3px 10px", borderRadius: 20 },
  linksRow: { display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" },
  link: { color: "#3d1a78", fontWeight: 600, fontSize: 12, textDecoration: "none", border: "1px solid #d6bcfa", padding: "5px 12px", borderRadius: 8 },
};
