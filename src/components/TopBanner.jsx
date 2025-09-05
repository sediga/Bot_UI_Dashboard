// components/TopBanner.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function TopBanner({ hideRibbon = true }) {
  const navigate = useNavigate();
  const ref = useRef(null);

  // Measure header height (logo bar + ribbon) and expose as CSS var for page padding
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--header-offset", `${el.offsetHeight}px`);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-100 pt-[env(safe-area-inset-top)]"
      role="banner"
      aria-label="Flowtra header"
    >
      {/* Top bar (logo + nav + auth) */}
      <section className="w-full">
        <div className="w-full mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start">
            <div className="flex flex-col justify-center">
              <div
                className="flex items-center space-x-4 cursor-pointer"
                onClick={() => navigate("/")}
              >
                <img
                  src="/assets/logo.png"
                  alt="Flowtra Logo"
                  className="h-12 w-auto object-contain"
                />
                <span className="text-5xl font-bold text-gray-800 tracking-tight leading-tight">
                  Flowtra<span className="text-indigo-500">.app</span>
                </span>
                <span className="bg-indigo-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  BETA
                </span>
              </div>
              <p className="text-gray-600 text-sm sm:text-base leading-tight mt-2">
                Automate browser flows — no code required.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition"
            >
              Sign Up
            </Link>
            <Link
              to="/docs"
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Help Center
            </Link>
          </div>
        </div>
      </section>

      {/* Design Partner ribbon (edge-to-edge, welcoming CTA) */}
      {!hideRibbon && (
      <section className="w-full bg-gradient-to-r border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-2 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">
                Shape the future of Flowtra
              </h2>
              <p className="mt-0.5 text-slate-600 text-sm md:text-base">
                We’re inviting early users and teams to join our Design Partner program. Get early access, help shape features, and enjoy priority support.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/join-design-partner"
                aria-label="Join as Design Partner"
                className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-white text-sm md:text-base font-medium hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                Join as Design Partner
              </Link>
              <Link
                to="/learn-more"
                className="hidden md:inline text-sky-700 hover:text-sky-800 text-sm font-medium"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
