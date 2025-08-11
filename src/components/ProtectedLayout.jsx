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
      }
  };
  

useEffect(() => {
  const token = localStorage.getItem("botflows_token");
  if (!token) {
    // no token -> just go to login; don't call logout() here
    navigate("/login");
    return;
  }

  // render the page; don't block on /api/me
  setLoading(false);

  // fire-and-forget: fetch profile to show email
  fetch(`${config.apiBaseUrl}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": config.apiKey,
    },
    credentials: "include",
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("me failed"))))
    .then((data) => setEmail(data?.username || data?.email || ""))
    .catch(() => {
      // don't force logout here — App/AuthContext handles refresh/inactivity
      console.warn("[ProtectedLayout] /api/me failed; continuing");
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
          <Link to="/" className="flex items-center space-x-2">
            <img src="/assets/logo.png" alt="Flowtra Logo" className="h-8" />
            <span className="text-white text-xl font-semibold">
              Flowtra Dashboard
            </span>
                <span className="bg-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded">BETA</span>
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
    {/* <div className="bg-white flex-1 w-full">
      <SectionWithBackground> */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      {/* </SectionWithBackground>
      </div> */}
    </div>
  );

};

export default ProtectedLayout;
