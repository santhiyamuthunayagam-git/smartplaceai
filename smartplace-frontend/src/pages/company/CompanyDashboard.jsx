import React, { useState } from "react";
import Sidebar from "../../Sidebar";

export default function CompanyDashboard() {
  const [activeTab, setActiveTab] = useState("pipeline");

  const tabs = [
    { key: "pipeline", label: "Applicant Pipeline", icon: "📋" },
    { key: "matches", label: "Smart Matches", icon: "✨" },
    { key: "postings", label: "Active Jobs", icon: "💼" },
  ];

  const pipeline = [
    { id: 201, name: "Pranav Raj", role: "SDE", status: "Under Review", match: 94, skills: ["React", "Node.js"] },
    { id: 202, name: "Anita K.", role: "Data Analyst", status: "Shortlisted", match: 88, skills: ["Python", "SQL"] },
    { id: 203, name: "John Doe", role: "SDE", status: "Interviewed", match: 91, skills: ["C++", "System Design"] },
  ];

  return (
    <div style={styles.container}>
      <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} role="company" />
      
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <h1 style={styles.title}>Recruitment Portal</h1>
          <button style={styles.btnNewJob}>+ Post New Job</button>
        </div>

        <div style={styles.contentArea}>
          {activeTab === "pipeline" && (
            <div>
              <h2 style={styles.sectionTitle}>Kanban Pipeline: Software Engineer</h2>
              <div style={styles.board}>
                {["Under Review", "Shortlisted", "Interviewed", "Rejected"].map(column => (
                  <div key={column} style={styles.column}>
                    <h3 style={styles.columnHeader}>{column}</h3>
                    {pipeline.filter(p => p.status === column).map(candidate => (
                      <div key={candidate.id} style={styles.card}>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                          <strong style={{fontSize: 15, color: '#2d3748'}}>{candidate.name}</strong>
                          <span style={styles.matchText}>{candidate.match}% Match</span>
                        </div>
                        <div style={styles.tagFlex}>
                           {candidate.skills.map(s => <span key={s} style={styles.miniTag}>{s}</span>)}
                        </div>
                        <button style={styles.btnAction}>View Profile</button>
                      </div>
                    ))}
                    {pipeline.filter(p => p.status === column).length === 0 && (
                      <div style={styles.emptyCard}>Drop candidates here</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "matches" && (
            <div style={styles.fadeAnim}>
              <h2 style={styles.sectionTitle}>AI Recommended Talent</h2>
              <p style={{color: '#718096', marginBottom: 20}}>The system went beyond GPAs and found these candidates based on project history and GitHub repositories that perfectly match your "Frontend Engineer" needs.</p>
              
              <div style={styles.matchCard}>
                <div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
                   <div style={styles.avatarLarge}>R</div>
                   <div>
                     <h3 style={{fontSize: 20, color: '#2d3748'}}>Ravi Verma <span style={{fontSize: 14, color: "#10b981", background: "#d1fae5", padding: "2px 8px", borderRadius: 10, marginLeft: 10}}>98% Match</span></h3>
                     <p style={{color: '#718096', marginTop: 4}}>Has built 3 full-stack React apps. Extracted from GitHub profile.</p>
                   </div>
                </div>
                <button style={styles.btnPrimary}>Invite to Apply</button>
              </div>
            </div>
          )}
          
          {activeTab === "postings" && (
            <div style={styles.placeholderBox}>
              <h2>Your Active Jobs</h2>
              <p>Manage your job postings here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", minHeight: "100vh", backgroundColor: "#f8f9fa", fontFamily: "'DM Sans', sans-serif" },
  mainContent: { marginLeft: 260, padding: "40px", flex: 1 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 700, color: "#2d3748", fontFamily: "'Playfair Display', serif" },
  btnNewJob: { background: "#6c3fc5", color: "white", padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" },
  contentArea: { minHeight: "60vh" },
  sectionTitle: { fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#2d3748" },
  board: { display: "flex", gap: 20, overflowX: "auto", paddingBottom: 10 },
  column: { flex: 1, minWidth: 280, background: "#edf2f7", borderRadius: 12, padding: "16px" },
  columnHeader: { fontSize: 13, textTransform: "uppercase", fontWeight: 700, color: "#4a5568", marginBottom: 16, borderBottom: "2px solid #e2e8f0", paddingBottom: 8 },
  card: { background: "white", padding: "16px", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: 12, cursor: "grab" },
  emptyCard: { border: "2px dashed #cbd5e0", padding: "20px", borderRadius: 8, textAlign: "center", color: "#a0aec0", fontSize: 13 },
  matchText: { color: "#10b981", fontSize: 12, fontWeight: 700 },
  tagFlex: { display: "flex", gap: 6, margin: "12px 0" },
  miniTag: { background: "#f1f5f9", fontSize: 11, padding: "2px 8px", borderRadius: 4, color: "#475569" },
  btnAction: { width: "100%", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px", fontSize: 12, fontWeight: 600, color: "#4a5568", cursor: "pointer" },
  fadeAnim: { animation: "fadeIn 0.3s ease-in" },
  placeholderBox: { padding: "40px", textAlign: "center", color: "#a0aec0", background: "white", border: "2px dashed #e2e8f0", borderRadius: 12 },
  matchCard: { background: "white", padding: "24px", borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  avatarLarge: { width: 64, height: 64, borderRadius: "50%", background: "#e9d8fd", color: "#6b46c1", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 28, fontWeight: 700 },
  btnPrimary: { background: "#3d1a78", color: "white", padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 600, cursor: "pointer" }
};
