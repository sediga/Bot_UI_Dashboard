// src/context/AuthContext.js
import React, { createContext, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";

const AuthContext = createContext();
// const isLoggedOut = useRef(false);

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
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId =
      payload[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ] || "0";

    localStorage.setItem("botflows_token", token);
    localStorage.setItem("botflows_userId", userId);
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());

    setUser({ token, userId });
  };

  const logout = (reason) => {
    // if (isLoggedOut.current) return;
    // isLoggedOut.current = true;

    localStorage.removeItem("botflows_token");
    localStorage.removeItem("botflows_userId");
    localStorage.removeItem("botflows_config");
    localStorage.setItem("logout_reason", reason);
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
        event.key === "logout_reason"
      ) {
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
        clearInterval(interval);
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
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        updateActivity();
      }
    });

    const interval = setInterval(checkActivity, 60000); // Every 1 min
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, updateActivity)
      );
      clearInterval(interval);
    };
  }, []);

  // Validate token on load
  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          localStorage.removeItem("botflows_token");
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user", err);
        localStorage.removeItem("botflows_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
