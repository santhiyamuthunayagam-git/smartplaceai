import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

// Create a local axios instance just for this file to talk to our new backend
const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const res = await API.post("/auth/login", { email, password, role });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        toast.success(`Welcome back, ${res.data.user.name}!`);
        
        if (role === "coordinator") navigate("/coordinator");
        else if (role === "student") navigate("/student");
        else navigate("/interviewer");
      } else {
        // REGISTER FLOW
        const res = await API.post("/auth/register", { name, email, password, role });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.user.role);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        toast.success(`Registration successful! Welcome, ${res.data.user.name}.`);

        if (role === "coordinator") navigate("/coordinator");
        else if (role === "student") navigate("/student");
        else navigate("/interviewer");
      }
    } catch (err) {
      if (err.message === "Network Error" || err.code === "ERR_NETWORK") {
        toast.warning("Backend is offline. Using Mock Login Instead!", { autoClose: 3000 });
        
        // MOCK FALLBACK: Allow testing the UI offline
        const mockUser = {
          name: isLogin ? (name || "Test User") : name,
          email: email || "test@example.com",
          role: role
        };
        localStorage.setItem("token", "dummy_offline_token");
        localStorage.setItem("role", role);
        localStorage.setItem("user", JSON.stringify(mockUser));
        
        if (role === "coordinator") navigate("/coordinator");
        else if (role === "student") navigate("/student");
        else navigate("/interviewer");
      } else {
        toast.error(err.response?.data?.message || "Login Failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { key: "student", label: "Student", icon: "🎓" },
    { key: "interviewer", label: "Interviewer", icon: "💼" },
    { key: "coordinator", label: "Coordinator", icon: "⚙️" },
  ];

  return (
    <div style={styles.page}>
      {/* Left Panel */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logo}>SP</div>
          <h1 style={styles.brand}>SmartPlace</h1>
          <p style={styles.tagline}>Your college placement, reimagined.</p>
          <div style={styles.features}>
            {["Smart matching beyond GPA", "Real-time status updates", "Zero manual tracking", "Feedback on every outcome"].map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <span style={styles.featureDot}>✦</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={styles.blob1} />
        <div style={styles.blob2} />
      </div>

      {/* Right Panel */}
      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.formTitle}>{isLogin ? "Sign In" : "Create Account"}</h2>
          <p style={styles.formSub}>{isLogin ? "Choose your role to continue" : "Join the placement platform"}</p>

          {/* Role Selector */}
          <div style={styles.roleRow}>
            {roles.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                style={{
                  ...styles.roleBtn,
                  ...(role === r.key ? styles.roleBtnActive : {}),
                }}
              >
                <span style={styles.roleIcon}>{r.icon}</span>
                <span style={styles.roleLabel}>{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.inputField}
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.inputField}
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.inputField}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              style={{...styles.submitBtn, opacity: loading ? 0.7 : 1}}
            >
              {loading ? "Processing..." : (isLogin ? `Sign in as ${roles.find(r => r.key === role)?.label}` : `Register as ${roles.find(r => r.key === role)?.label}`)}
            </button>
          </form>

          <p style={styles.hint}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span style={styles.linkToggle} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign Up" : "Log In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" },
  left: {
    width: "45%", background: "linear-gradient(145deg, #3d1a78 0%, #6c3fc5 60%, #8b5cf6 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden",
  },
  leftContent: { position: "relative", zIndex: 2, padding: "60px", color: "white" },
  logo: {
    width: 56, height: 56, background: "rgba(255,255,255,0.15)",
    borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, fontWeight: 700, color: "white", marginBottom: 20,
    backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
  },
  brand: { fontSize: 42, fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 10 },
  tagline: { fontSize: 16, opacity: 0.8, marginBottom: 40, lineHeight: 1.6 },
  features: { display: "flex", flexDirection: "column", gap: 14 },
  featureItem: { display: "flex", alignItems: "center", gap: 12, fontSize: 15, opacity: 0.9 },
  featureDot: { color: "#c4b5fd", fontSize: 12 },
  blob1: {
    position: "absolute", width: 300, height: 300,
    background: "rgba(255,255,255,0.05)", borderRadius: "50%",
    top: -80, right: -80,
  },
  blob2: {
    position: "absolute", width: 200, height: 200,
    background: "rgba(255,255,255,0.05)", borderRadius: "50%",
    bottom: -50, left: -50,
  },
  right: {
    width: "55%", display: "flex", alignItems: "center",
    justifyContent: "center", background: "#f5f3ff", padding: "40px",
  },
  formBox: {
    background: "white", borderRadius: 24, padding: "48px",
    boxShadow: "0 8px 40px rgba(108,63,197,0.12)",
    width: "100%", maxWidth: 460,
  },
  formTitle: { fontSize: 30, fontFamily: "'Playfair Display', serif", color: "#3d1a78", marginBottom: 6 },
  formSub: { fontSize: 14, color: "#a0a0b8", marginBottom: 28 },
  roleRow: { display: "flex", gap: 10, marginBottom: 28 },
  roleBtn: {
    flex: 1, padding: "12px 8px", borderRadius: 12, border: "1.5px solid #ececf6",
    background: "white", cursor: "pointer", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 6, transition: "all 0.2s ease",
  },
  roleBtnActive: {
    border: "1.5px solid #8b5cf6", background: "#f5f3ff",
    boxShadow: "0 0 0 3px rgba(139,92,246,0.1)",
  },
  roleIcon: { fontSize: 22 },
  roleLabel: { fontSize: 12, fontWeight: 600, color: "#5a5a7a" },
  fieldGroup: { marginBottom: 18 },
  label: { display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#4a5568" },
  inputField: { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box" },
  submitBtn: { width: "100%", padding: "14px", fontSize: "15px", marginTop: "8px", background: "#6c3fc5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" },
  hint: { fontSize: 14, color: "#718096", textAlign: "center", marginTop: 24 },
  linkToggle: { color: "#6c3fc5", fontWeight: 700, cursor: "pointer" }
};