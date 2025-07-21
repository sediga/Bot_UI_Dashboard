import React, { useState, useEffect } from "react";
import { useNavigate, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RecorderDashboard from "./components/RecorderDashboard";
import LandingPage from "./components/LandingPage";
import ProtectedLayout from "./components/ProtectedLayout";
const SessionTimeout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTimeout = () => {
      const expiry = localStorage.getItem("botflows_token_expiry");
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        localStorage.removeItem("botflows_token");
        localStorage.removeItem("botflows_token_expiry");
        localStorage.removeItem("botflows_user_id");
        alert("Session expired. Please log in again.");
        navigate("/login");
      }
    };

    const interval = setInterval(checkTimeout, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [navigate]);

  return null;
};

function App() {
  const [userId, setUserId] = useState(localStorage.getItem("botflows_user_id"));

  useEffect(() => {
    const handleStorageChange = () => {
      setUserId(localStorage.getItem("botflows_user_id"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <Router>
      <SessionTimeout />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Support future nested routes inside dashboard */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedLayout>
              <RecorderDashboard />
            </ProtectedLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
