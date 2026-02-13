import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import SectionWithBackground from "./SectionWithBackground";
import TopBanner from "./TopBanner";
import Footer from "../components/Footer";
import { gaEvent } from "../utils/analytics";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("Google user:", decoded);

      const res = await fetch(`${config.apiBaseUrl}/api/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        credentials: "include", // 🔧 add this
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Google login failed");
      }

      const data = await res.json();
      login(data.token);
      gaEvent("login_google");
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login failed:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user]);

  useEffect(() => {
    localStorage.removeItem("logout_reason");
    
    const reason = localStorage.getItem("logout_reason");
    if ((reason || "").startsWith("inactivity")) {
      alert("You've been logged out due to inactivity. All unsaved changes were discarded.");
      localStorage.removeItem("logout_reason"); // Clean it
    }
  }, []);
  
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403 && errorData?.requiresVerification) {
          navigate(`/check-email?email=${encodeURIComponent(errorData?.email || email)}`);
          return;
        }
        throw new Error(errorData.message || "Login failed");
      }

      const data = await res.json();
      // Save it
      login(data.token);
      gaEvent("login_email");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
<div style={{ paddingTop: "var(--header-offset)" }}>  
    <div className="w-full grid grid-rows-[auto,1fr] bg-white">
      <TopBanner /> {/* header */}  {/* :contentReference[oaicite:1]{index=1} */}

      {/* Wave background now wraps content AND footer */}
      <SectionWithBackground>
        {/* Inside the wave: 2 rows -> form (fills) + footer (auto) */}
        <div className="min-h-full grid grid-rows-[1fr,auto]">
          <div className="min-h-0 flex items-center justify-center px-4 py-40 overflow-auto">
            <form onSubmit={handleLogin} className="p-6 rounded-lg w-full max-w-md backdrop-blur">
              <h2 className="text-2xl font-semibold mb-4">Login</h2>
              {error && <p className="text-red-500 mb-2">{error}</p>}
              <input type="email" placeholder="Email" className="w-full mb-3 p-2 border rounded"
                     value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" className="w-full mb-4 p-2 border rounded"
                     value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                Log In
              </button>
              <p className="text-sm mt-4">
                Don&apos;t have an account?{" "}
                <Link className="text-blue-600 hover:underline" to="/signup">Sign up</Link>
              </p>
              <div className="mt-4 flex justify-center">
                <GoogleLogin onSuccess={handleGoogleLoginSuccess}
                             onError={() => console.error("Google login error")} />
              </div>
            </form>
          </div>

        </div>
      </SectionWithBackground>
      <div className="[&>footer]:mt-0">
        <Footer />
      </div>
    </div>
</div>
  );
};

export default Login;
