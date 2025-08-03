import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import config from "../config";
import SectionWithBackground from "./SectionWithBackground";
import TopBanner from "./TopBanner";
import Footer from "../components/Footer";

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
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white min-h-screen w-full">
      <SectionWithBackground>
        <div className="h-screen flex flex-col">
          <TopBanner />
          <div className="flex-1 flex items-center justify-center px-4">
            <form
              onSubmit={handleSignup}
              className="p-6 rounded-lg w-full max-w-md"
            >
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
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
              >
                Sign Up
              </button>
              <p className="text-xs text-gray-500 mt-4">
                By signing up, you agree to our{" "}
                <Link to="/terms" className="underline text-blue-600">Terms of Use</Link> and{" "}
                <Link to="/privacy" className="underline text-blue-600">Privacy Policy</Link>.
              </p>
              <p className="text-sm mt-4">
                Already have an account?{" "}
                <a className="text-blue-600" href="/login">
                  Log in
                </a>
              </p>
            </form>
          </div>
        <Footer  className="text-gray-500 text-sm py-6 pb-10 border-t-4 mt-10"/>
        </div>
      </SectionWithBackground>
    </div>
  );
};

export default Signup;
