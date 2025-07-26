import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";

const ProtectedLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const handleLogout = () => {
      if (window.confirm("Are you sure you want to log out?")) {
        logout();
        navigate("/");
      }
  };

  useEffect(() => {
    const reason = localStorage.getItem("logout_reason");
    if (reason === "inactivity") {
      alert("You've been logged out due to inactivity. All unsaved changes were discarded.");
      localStorage.removeItem("logout_reason"); // Clean it
    }
  }, []);
  
  useEffect(() => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      setLoading(false);
      navigate("/login");
      return;
    }

    // Optional: Verify token by calling /api/me
    fetch(`${config.apiBaseUrl}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": config.apiKey,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setEmail(data.username || "");  // ✅ assuming response contains { email: "..." }
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem("botflows_token");
        navigate("/login");
      });
  }, [navigate]);

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-gray-800 text-white p-4 flex justify-between items-center shadow">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-0">
            <img src="/assets/logo.png" alt="Botflows Logo" className="h-8" />
            <span className="text-white text-xl font-semibold">
              otflows Dashboard
            </span>
          </Link>
        </div>
        {/* Right side */}
        <div className="flex items-center space-x-4">
          {email && <span className="text-sm text-white">{email}</span>}
          <button
            onClick={handleLogout}
            className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );

};

export default ProtectedLayout;
