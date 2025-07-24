// src/context/AuthContext.js
import React, { createContext, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Correct
import config from "../config";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("botflows_token");
    const userId = localStorage.getItem("botflows_userId");
    return token && userId ? { token, userId } : null;
  });
  const [loading, setLoading] = useState(true);

  const login = (token) => {
    const now = Date.now();
    const timeoutMinutes = 20; // set your timeout duration
    const expiry = now + timeoutMinutes * 60 * 1000;

    localStorage.setItem("botflows_token", token);
    localStorage.setItem("botflows_token_expiry", expiry.toString());
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "0";
    localStorage.setItem("botflows_userId", userId);
    setUser({ token, userId });
  };

  const logout = () => {
    localStorage.removeItem("botflows_token");
    localStorage.removeItem("botflows_userId");
    setUser(null);
    const navigate = useNavigate();
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-api-key": config.apiKey, // if needed
        };

        const res = await fetch(`${config.apiBaseUrl}/api/me`, {
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          localStorage.removeItem("botflows_token");
        }
      } catch (err) {
        console.error("Error fetching user", err);
        localStorage.removeItem("botflows_token");
      } finally {
        setLoading(false);
      }
    };

    fetchUser(); // 👈 Call the inner async function
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
