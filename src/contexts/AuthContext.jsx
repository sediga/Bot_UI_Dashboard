// src/context/AuthContext.js
import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("botflows_token");
    const userId = localStorage.getItem("botflows_userId");
    return token && userId ? { token, userId } : null;
  });

  const login = (token) => {
    localStorage.setItem("botflows_token", token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "0";
    localStorage.setItem("botflows_userId", userId);
    setUser({ token, userId });
  };

  const logout = () => {
    localStorage.removeItem("botflows_token");
    localStorage.removeItem("botflows_userId");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
