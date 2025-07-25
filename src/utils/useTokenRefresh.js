import { useEffect } from "react";
import jwtDecode from "jwt-decode";

const useTokenRefresh = (login) => {
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("botflows_token");
      if (!token) return;

      const { exp } = jwtDecode(token); // exp is in seconds
      const now = Date.now();

      const timeRemaining = exp * 1000 - now;

      if (timeRemaining < 2 * 60 * 1000) { // less than 2 minutes left
        fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include", // 👈 sends refresh token cookie
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.token) {
              localStorage.setItem("botflows_token", data.token);
              login(data.token); // update app state
              console.log("✅ Access token refreshed");
            } else {
              console.warn("⚠️ No token returned during refresh");
            }
          })
          .catch((err) => {
            console.error("Refresh failed:", err);
          });
      }
    }, 60000); // check every minute

    return () => clearInterval(interval);
  }, [login]);
};

export default useTokenRefresh;
