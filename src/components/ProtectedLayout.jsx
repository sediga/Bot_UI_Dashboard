import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";
import { getUpdateStatus } from "./agentUpdateClient";
import AgentUpdateBanner from "./AgentUpdateBanner";
import { parseJwt } from "../utils/auth";

const ProtectedLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  // --- Agent update banner state (consistent names) ---
  const [updateStatus, setUpdateStatus] = useState(null); // null => agent offline or not fetched
  const [showBanner, setShowBanner] = useState(false);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  // Auth gate + load /api/me
  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      navigate("/login");
      return;
    }

    // detect guest and skip /api/me
    const p = parseJwt(token);
    const roles =
      (p?.roles) ||
      (p?.role) ||
      (p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]) ||
      [];
    const roleList = Array.isArray(roles) ? roles : [roles].filter(Boolean);
    const isGuest = roleList.includes("Guest");

    setLoading(false); // render right away

    if (isGuest) {
      // optional: show "Guest" in header
      setEmail("Guest");
      return; // <-- do not call /api/me or logout on 401
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": config.apiKey,
          },
          credentials: "include",
        });

        if (res.status === 401 || res.status === 419) {
          if (!cancelled) {
            logout?.();
            navigate("/login");
          }
          return;
        }

        if (!res.ok) throw new Error("me failed");
        const data = await res.json();
        if (data?.isGuest !== true && data?.emailVerified === false) {
          navigate(`/check-email?email=${encodeURIComponent(data?.username || "")}`);
          return;
        }
        if (!cancelled) setEmail(data?.username || data?.email || "");
      } catch (e) {
        console.warn("[ProtectedLayout] /api/me failed; continuing", e);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate, logout]);

  // Agent update check (on each login session)
  const refreshStatus = React.useCallback(async () => {
    try {
      const s = await getUpdateStatus(config.agentServerUrl);
      if (!s) return; // aborted/timeout/non-200 -> do nothing

      setUpdateStatus(s);
      if (s.needsUpdate) {
        const seenKey = `agent-update-seen-${s.availableVersion}`;
        if (!sessionStorage.getItem(seenKey)) {
          setShowBanner(true);
          sessionStorage.setItem(seenKey, "1");
        }
      } else {
        setShowBanner(false);
      }
    } catch (e) {
      if (e && e.name === "AbortError") return; // <- ignore aborts
      // Only mark offline for real errors
      setUpdateStatus(null);
      // optionally: setShowBanner(true);
    }
  }, []);

  React.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-blue-800 text-gray p-4 flex justify-between items-center shadow">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/assets/logo.png" alt="Flowtra Logo" className="h-8" />
            <span className="text-white text-xl font-semibold">Flowtra Dashboard</span>
            <span className="bg-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded">
              BETA
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {email && <span className="text-sm text-white">{email}</span>}
          <button
            onClick={handleLogout}
            className="bg-white-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Agent update banner under header */}
      {showBanner && (
        <div style={{ margin: "12px 0" }}>
          <AgentUpdateBanner
            status={updateStatus}              // null => offline (Start/Download shown)
            onHide={() => setShowBanner(false)}
            refreshStatus={refreshStatus}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
};

export default ProtectedLayout;
