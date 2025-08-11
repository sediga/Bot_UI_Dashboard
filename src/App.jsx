import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Routes, Route, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RecorderDashboard from "./components/RecorderDashboard";
import LandingPage from "./components/LandingPage";
import ProtectedLayout from "./components/ProtectedLayout";
import config from "./config";
import FeedbackBubble from "./components/FeedbackBubble";
import { useAuth } from "./contexts/AuthContext";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

function App() {
  const { user, login, logout } = useAuth();

  const navigate = useNavigate(); // ✅ This will now work, since App is under <Router>

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("botflows_token");
      if (!token) return;

      try {
        const { exp } = jwtDecode(token);
        const now = Date.now();
        const timeRemaining = exp * 1000 - now;

        if (timeRemaining < 2 * 60 * 1000) {
          fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "x-api-key": config.apiKey },
          })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error("refresh failed"))))
            .then((data) => {
              if (data.token) {
                login(data.token);
                localStorage.setItem("last_user_activity_time", Date.now().toString()); // ✅ refresh session activity
              }
            })
            .catch((err) => {
              console.error("Token refresh failed:", err);
              localStorage.removeItem("botflows_token");
              logout("inactivity")
             navigate("/login");
            });
        }
      } catch (e) {
        console.warn("Error decoding token for refresh");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <>
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login login={login} />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedLayout>
              <RecorderDashboard />
            </ProtectedLayout>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
      </Routes>
    </GoogleOAuthProvider>

      {/* ...your site layout */}
      <FeedbackBubble />
    </>
  );
}

export default App;
