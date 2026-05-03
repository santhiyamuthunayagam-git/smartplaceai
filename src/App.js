import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./login";
import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import InterviewerDashboard from "./pages/interviewer/InterviewerDashboard";

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  if (!token) return <Navigate to="/" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/coordinator" element={<PrivateRoute role="coordinator"><CoordinatorDashboard /></PrivateRoute>} />
        <Route path="/student" element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>} />
        <Route path="/interviewer" element={<PrivateRoute role="interviewer"><InterviewerDashboard /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;