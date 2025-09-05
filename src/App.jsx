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
import JoinDesignPartnerPage from "./pages/JoinDesignPartnerPage";
import DesignPartnerLearnMore from "./pages/DesignPartnerLearnMore";
import Docs from "./pages/Docs";

function App() {
  const { user, login, logout } = useAuth();

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
        <Route path="/join-design-partner" element={<JoinDesignPartnerPage />} />
        <Route path="/learn-more" element={<DesignPartnerLearnMore />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </GoogleOAuthProvider>

      {/* ...your site layout */}
      <FeedbackBubble />
    </>
  );
}

export default App;
