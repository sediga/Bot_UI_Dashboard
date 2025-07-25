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

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) return null;

    try {
      const payload = jwtDecode(token);
      const userId = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      return { token, userId };
    } catch {
      return null;
    }
  });

  const navigate = useNavigate(); // ✅ This will now work, since App is under <Router>

  const logout = () => {
    localStorage.removeItem("botflows_token");
    setUser(null);
    navigate("/login");
  };

  const login = (token) => {
    try {
      const payload = jwtDecode(token);
      const userId = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
      localStorage.setItem("botflows_token", token);
      setUser({ token, userId });
    } catch {
      console.warn("Invalid token format");
    }
  };

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
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.token) login(data.token);
              else throw new Error("No token in refresh response");
            })
            .catch((err) => {
              console.error("Token refresh failed:", err);
              localStorage.removeItem("botflows_token");
              setUser(null);
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
      </Routes>
    </GoogleOAuthProvider>
  );
}

export default App;
