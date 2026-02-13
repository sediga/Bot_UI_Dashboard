import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import config from "../config";
import TopBanner from "../components/TopBanner";
import SectionWithBackground from "../components/SectionWithBackground";
import Footer from "../components/Footer";

function getEmailFromQuery(search) {
  const p = new URLSearchParams(search);
  return (p.get("email") || "").trim();
}

export default function CheckEmailPage() {
  const { search, state } = useLocation();
  const initialEmail = useMemo(() => getEmailFromQuery(search), [search]);

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(state?.message || "");
  const [error, setError] = useState(state?.verificationError || "");

  const resend = async () => {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Please enter your signup email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/api/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to resend verification email.");
      setMessage(data?.message || "Verification email sent.");
      setError(data?.verificationSent === false ? (data?.verificationError || "Email delivery failed.") : "");
    } catch (err) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <TopBanner />
      <SectionWithBackground>
        <div className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Verify Your Email</h1>
            <p className="mt-3 text-slate-600">
              We sent a verification link to your email. You must verify before accessing the dashboard.
            </p>

            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={resend}
                disabled={loading}
                className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </button>
              <Link to="/login" className="text-sm text-sky-700 hover:underline">
                Back to login
              </Link>
            </div>

            {message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          </div>
        </div>
      </SectionWithBackground>
      <div className="[&>footer]:mt-0">
        <Footer />
      </div>
    </div>
  );
}
