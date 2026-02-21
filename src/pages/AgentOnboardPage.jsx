import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import config from "../config";

export default function AgentOnboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking session...");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nonce = params.get("nonce") || "";
    if (!nonce) {
      setError("Missing onboarding nonce.");
      setStatus("");
      return;
    }

    const token = localStorage.getItem("botflows_token") || "";
    if (!token) {
      const next = encodeURIComponent(`/agent/onboard?nonce=${encodeURIComponent(nonce)}`);
      navigate(`/login?next=${next}`, { replace: true });
      return;
    }

    const run = async () => {
      try {
        setStatus("Linking this agent to your account...");
        const res = await fetch(`${config.apiBaseUrl}/api/agent/link-complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
            "x-api-key": config.apiKey,
          },
          body: JSON.stringify({ nonce }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.message || "Failed to link agent.");
        }
        setStatus("Agent linked successfully. You can return to the agent now.");
      } catch (e) {
        setError(String(e?.message || e));
        setStatus("");
      }
    };
    run();
  }, [location.search, navigate]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-xl bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-semibold mb-3">Agent Onboarding</h1>
        {status && <p className="text-slate-700">{status}</p>}
        {error && <p className="text-red-700">{error}</p>}
      </section>
    </main>
  );
}

