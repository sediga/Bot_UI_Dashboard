// App.jsx
import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuth } from "./contexts/AuthContext";
import { gaInit, gaPageView, gaSetUserId } from "./utils/analytics";

import Login from "./components/Login";
import Signup from "./components/Signup";
import RecorderDashboard from "./components/RecorderDashboard";
import LandingPage from "./components/LandingPage";
import ProtectedLayout from "./components/ProtectedLayout";
import FeedbackBubble from "./components/FeedbackBubble";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import JoinDesignPartnerPage from "./pages/JoinDesignPartnerPage";
import DesignPartnerLearnMore from "./pages/DesignPartnerLearnMore";
import GuestStart from "./pages/GuestStart";
import Docs from "./pages/Docs";
import CheckEmailPage from "./pages/CheckEmailPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import config from "./config";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || window.__GA_MEASUREMENT_ID__ || "";

// Tracks GA once per route change and when user id appears
function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => { gaInit(GA_ID); }, []);
  useEffect(() => { if (user?.userId) gaSetUserId(user.userId); }, [user?.userId]);
  useEffect(() => { gaPageView(location.pathname + location.search); }, [location]);

  return null;
}

export default function App() {
  const { login } = useAuth();

  return (
    <GoogleOAuthProvider clientId={config.googleClientId}>
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login login={login} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
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
        <Route path="/guest" element={<GuestStart />} />
        <Route path="/learn-more" element={<DesignPartnerLearnMore />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>

      <FeedbackBubble />
    </GoogleOAuthProvider>
  );
}
