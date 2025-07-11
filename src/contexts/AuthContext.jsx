// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("botflows_token");
    return token ? { token } : null;
  });

  const login = (token) => {
    localStorage.setItem("botflows_token", token);
    setUser({ token });
  };

  const logout = () => {
    localStorage.removeItem("botflows_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
