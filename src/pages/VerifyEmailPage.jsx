import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import config from "../config";
import TopBanner from "../components/TopBanner";
import SectionWithBackground from "../components/SectionWithBackground";
import Footer from "../components/Footer";

function query(search) {
  const p = new URLSearchParams(search);
  return {
    token: (p.get("token") || "").trim(),
    email: (p.get("email") || "").trim(),
  };
}

export default function VerifyEmailPage() {
  const { search } = useLocation();
  const { token, email } = useMemo(() => query(search), [search]);
  const [state, setState] = useState({ loading: true, ok: false, message: "" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token || !email) {
        if (!cancelled) setState({ loading: false, ok: false, message: "Invalid verification link." });
        return;
      }
      try {
        const url = `${config.apiBaseUrl}/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "x-api-key": config.apiKey,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Email verification failed.");
        if (!cancelled) setState({ loading: false, ok: true, message: data?.message || "Email verified successfully." });
      } catch (err) {
        if (!cancelled) setState({ loading: false, ok: false, message: err.message || "Email verification failed." });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [token, email]);

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <TopBanner />
      <SectionWithBackground>
        <div className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Email Verification</h1>
            {state.loading ? (
              <p className="mt-4 text-slate-600">Verifying your email...</p>
            ) : (
              <p className={`mt-4 text-sm ${state.ok ? "text-emerald-700" : "text-rose-600"}`}>
                {state.message}
              </p>
            )}

            <div className="mt-6">
              <Link to="/login" className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </SectionWithBackground>
      <div className="[&>footer]:mt-0">
        <Footer />
      </div>
    </div>
  );
}

