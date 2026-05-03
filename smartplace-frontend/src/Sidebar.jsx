import React from "react";
import { useNavigate } from "react-router-dom";
 
export default function Sidebar({ tabs, activeTab, setActiveTab, role }) {
  const navigate = useNavigate();
 
  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };
 
  const roleColors = {
    coordinator: { bg: "#3d1a78", light: "rgba(255,255,255,0.1)" },
    student: { bg: "#3d1a78", light: "rgba(255,255,255,0.1)" },
    company: { bg: "#3d1a78", light: "rgba(255,255,255,0.1)" },
  };
 
  const user = JSON.parse(localStorage.getItem("user") || "{}");
 
  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.logo}>SP</div>
        <div>
          <div style={styles.brandName}>SmartPlace</div>
          <div style={styles.roleTag}>{role?.charAt(0).toUpperCase() + role?.slice(1)} Portal</div>
        </div>
      </div>
 
      {/* User Info */}
      <div style={styles.userCard}>
        <div style={styles.avatar}>{user?.name?.charAt(0) || role?.charAt(0).toUpperCase()}</div>
        <div>
          <div style={styles.userName}>{user?.name || "User"}</div>
          <div style={styles.userEmail}>{user?.email || ""}</div>
        </div>
      </div>
 
      {/* Nav */}
      <nav style={styles.nav}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...styles.navBtn,
              ...(activeTab === tab.key ? styles.navBtnActive : {}),
            }}
          >
            <span style={styles.navIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
 
      {/* Logout */}
      <button onClick={handleLogout} style={styles.logoutBtn}>
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </div>
  );
}
 
const styles = {
  sidebar: {
    width: 260, minHeight: "100vh", background: "linear-gradient(180deg, #3d1a78 0%, #6c3fc5 100%)",
    display: "flex", flexDirection: "column", padding: "28px 16px",
    position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100,
  },
  logoArea: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28, padding: "0 8px" },
  logo: {
    width: 42, height: 42, background: "rgba(255,255,255,0.15)", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, color: "white",
  },
  brandName: { fontSize: 18, fontWeight: 700, color: "white", fontFamily: "'Playfair Display', serif" },
  roleTag: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  userCard: {
    display: "flex", alignItems: "center", gap: 12,
    background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", marginBottom: 28,
  },
  avatar: {
    width: 38, height: 38, background: "rgba(255,255,255,0.2)", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 600, color: "white" },
  userEmail: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2, wordBreak: "break-all" },
  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 10, border: "none", background: "transparent",
    color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s ease", textAlign: "left",
    fontFamily: "'DM Sans', sans-serif",
  },
  navBtnActive: {
    background: "rgba(255,255,255,0.15)", color: "white",
    fontWeight: 600,
  },
  navIcon: { fontSize: 18, width: 24, textAlign: "center" },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 10, border: "none", background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500,
    cursor: "pointer", transition: "all 0.2s ease", marginTop: 8,
    fontFamily: "'DM Sans', sans-serif",
  },
};