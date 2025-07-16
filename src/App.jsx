import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RecorderDashboard from "./components/RecorderDashboard";
import LandingPage from "./components/LandingPage";
import ProtectedLayout from "./components/ProtectedLayout";
import { UserContext } from "./contexts/UserContext";

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
    <UserContext.Provider value={{ userId, setUserId }}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <RecorderDashboard />
              </ProtectedLayout>
            }
          />
        </Routes>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
