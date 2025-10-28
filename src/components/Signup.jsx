import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";
import SectionWithBackground from "./SectionWithBackground";
import TopBanner from "./TopBanner";
import Footer from "../components/Footer";
import { gaEvent } from "../utils/analytics";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Signup failed");
      }
      navigate("/login");
      gaEvent("signup_complete");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
<div style={{ paddingTop: "var(--header-offset)" }}>      

    <div className="w-full grid grid-rows-[auto,1fr] bg-white">
      {/* Header */}
      <TopBanner />

      {/* Content row with wave background stretching to the footer */}
      <SectionWithBackground>
        <div className="min-h-full grid grid-rows-[1fr,auto]">
        <div className="min-h-0 flex items-center justify-center px-4 py-36 overflow-auto">
          <form onSubmit={handleSignup} className="p-6 rounded-lg w-full max-w-md bg-transparent">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Sign Up</h2>
            {error && <p className="text-red-500 mb-3">{error}</p>}

            <input
              type="email"
              placeholder="Email"
              className="w-full mb-3 p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full mb-3 p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full mb-4 p-2 border rounded"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              Sign Up
            </button>

            <p className="text-xs text-gray-500 mt-4">
              By signing up, you agree to our{" "}
              <Link to="/terms" className="underline text-blue-600">Terms of Use</Link> and{" "}
              <Link to="/privacy" className="underline text-blue-600">Privacy Policy</Link>.
            </p>

            <p className="text-sm mt-4">
              Already have an account?{" "}
              <a className="text-blue-600" href="/login">Log in</a>
            </p>
          </form>
        </div>
        </div>
      </SectionWithBackground>

      {/* Footer row — override ONLY here to cancel its internal mt-10 */}
      <div className="[&>footer]:mt-0">
        <Footer />
      </div>
    </div>
</div>
  );
};

export default Signup;
