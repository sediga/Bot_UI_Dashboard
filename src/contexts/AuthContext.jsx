// src/context/AuthContext.js
import React, { createContext, useEffect, useState, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import config from "../config";

const AuthContext = createContext();
// const isLoggedOut = useRef(false);
// Helpers to read JWT in multiple claim formats
function decode(token) {
  try { return jwtDecode(token); } catch { return null; }
}
function getUserIdFromPayload(p) {
  return (
    p?.sub ||
    p?.nameid ||
    p?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    null
  );
}
function getRolesFromPayload(p) {
  const raw =
    p?.roles ||
    p?.role ||
    p?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    [];
  return Array.isArray(raw) ? raw : [raw].filter(Boolean);
}
function isGuestPayload(p) {
  return getRolesFromPayload(p).includes("Guest");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("botflows_token");
    const userId = localStorage.getItem("botflows_userId");
    return token && userId ? { token, userId } : null;
  });

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const ACTIVITY_KEY = "last_user_activity_time";
  const TIMEOUT_MS = 20 * 60 * 1000;

  const login = (token) => {
    const p = decode(token);
    if (!p) {
      localStorage.removeItem("botflows_token");
      localStorage.removeItem("botflows_userId");
      return logout("Error");
    }

    const userId = getUserIdFromPayload(p) || "0";
    localStorage.setItem("botflows_token", token);
    localStorage.setItem("botflows_userId", userId);
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());

    // If this is a guest token, synthesize a minimal user object
    if (isGuestPayload(p)) {
      setUser({
        token,
        userId,
        roles: ["Guest"],
        isGuest: true,
        plan: "guest",
      });
      return;
    }

    // Real users: keep existing shape; /api/me will enrich it
    setUser((prev) => ({ ...(prev || {}), token, userId }));
  };


  const logout = (reason) => {
    // if (isLoggedOut.current) return;
    // isLoggedOut.current = true;

    localStorage.removeItem("botflows_token");
    localStorage.removeItem("botflows_userId");
    localStorage.removeItem("botflows_config");
    localStorage.removeItem(ACTIVITY_KEY); // <-- stop inactivity checks from retriggering
    // ensure storage event always fires (even for same reason twice)
    localStorage.removeItem("logout_reason");
    localStorage.setItem("logout_reason", `${reason}:${Date.now()}`);
    setUser(null);

    if (reason === "inactivity") {
      console.log("💤 Logging out due to inactivity");
      navigate("/login");
    } else {
      navigate("/");
    }
  };

  // Sync logout across tabs
  useEffect(() => {
    const onStorageChange = (event) => {
      if (
        (event.key === "botflows_token" && event.newValue === null) ||
        (event.key === "logout_reason" && event.newValue)
      ) {
        localStorage.removeItem(ACTIVITY_KEY);
        setUser(null);
        navigate("/login");
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  // Track user activity and logout on inactivity
  useEffect(() => {
    let lastUpdate = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) { // only update every 5 sec
        localStorage.setItem(ACTIVITY_KEY, now.toString());
        lastUpdate = now;
      }
    };

   const checkActivity = () => {
     const last = parseInt(localStorage.getItem(ACTIVITY_KEY), 10);
     if (!isNaN(last) && Date.now() - last > TIMEOUT_MS) {
       logout("inactivity");
     }
   };
    // Initial mark
    updateActivity();

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) =>
      window.addEventListener(event, updateActivity)
    );

    // Reset on tab switch
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateActivity();
      }
    };
 
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = setInterval(checkActivity, 60000); // Every 1 min

    const onFocus = () => {
      const token = localStorage.getItem("botflows_token");
      if (!token) return;

      const p = decode(token);
      if (p && isGuestPayload(p)) return; // guests don't refresh tokens

      try {
        const { exp } = jwtDecode(token);
        if (exp * 1000 - Date.now() < 5 * 60 * 1000) {
          fetch(`${config.apiBaseUrl}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "x-api-key": config.apiKey },
          })
            .then((res) => (res.ok ? res.json() : Promise.reject({ status: res.status })))
            .then((data) => {
              if (data?.token) {
                login(data.token);
                localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
              }
            })
            .catch((err) => {
              if (err && (err.status === 401 || err.status === 403)) {
                logout("Error"); // truly expired/invalid
              }
              // else: ignore transient errors; do not log out
            });        }
      } catch {}
    };
    window.addEventListener("focus", onFocus);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Validate token on load
  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) { setLoading(false); return; }

    const p = decode(token);
    const userId = localStorage.getItem("botflows_userId") || getUserIdFromPayload(p) || null;

    // If guest → set user immediately and skip /api/me
    if (p && isGuestPayload(p)) {
      setUser({
        token,
        userId,
        roles: ["Guest"],
        isGuest: true,
        plan: "guest",
      });
      setLoading(false);
      return;
    }

    // Real users → call /api/me
    (async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/me`, {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser((prev) => ({ ...(prev || {}), ...data, token, userId }));
        } else if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("botflows_token");
          localStorage.removeItem("botflows_userId");
          setUser(null);
        } else {
          console.warn("/api/me non-auth error:", res.status);
        }
      } catch (err) {
        console.error("Error fetching user", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
