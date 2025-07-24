import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

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
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Google login failed");
      }

      const data = await res.json();
      login(data.token);
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

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await res.json();
      // Save it
      login(data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-4">Login</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
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
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Sign In
        </button>
        <p className="text-sm mt-4">
          Don't have an account?{" "}
          <a className="text-blue-600" href="/signup">
            Sign up
          </a>
        </p>
        <div className="mt-4 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={() => console.error("Google login error")}
          />
        </div>
      </form>
    </div>
  );
};

export default Login;
