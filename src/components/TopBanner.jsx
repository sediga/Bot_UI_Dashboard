// components/TopBanner.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function TopBanner({ hideRibbon = true }) {
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--header-offset",
        `${el.offsetHeight}px`
      );
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
              </div>
              <p className="text-gray-600 text-sm sm:text-base leading-tight mt-2">
                Turn repetitive portal work into reliable flows — without an IT
                project.
              </p>
            </div>
          </div>

          {/* AUTH / CTAs */}
          <div className="flex flex-wrap gap-3">
            {/* Design Partner as primary nav CTA */}
            <Link
              to="/learn-more"
              aria-label="Learn about the Flowtra Design Partner program"
              className="px-4 py-2 rounded-lg font-medium border border-sky-300 text-sky-700 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              Bring us a workflow
            </Link>

            <Link
              to="/login"
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition"
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
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition"
            >
              Help Center
            </Link>
          </div>
        </div>
      </section>

      {/* Design Partner ribbon (edge-to-edge, welcoming CTA) */}
      {!hideRibbon && (
        <section className="w-full bg-gradient-to-r from-sky-50 via-white to-slate-50 border-t border-slate-200">
          <div className="mx-auto max-w-screen-2xl px-2 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-base md:text-lg font-semibold text-slate-900">
                  Reliable execution for portal-heavy work
                </h2>
                <p className="mt-0.5 text-slate-600 text-sm md:text-base">
                  We work hands-on with healthcare teams to take repetitive work out of external portals — by turning real workflows into reliable flows that just run.
               </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 md:mt-0">
                {/* Primary: Design Partner */}
                <Link
                  to="/join-design-partner"
                  aria-label="Get started as a Flowtra Design Partner"
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-sm md:text-base font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 text-center leading-snug"
                >
                  Bring us a workflow
                </Link>

                {/* <Link
                  to="/guest"
                  aria-label="Try Flowtra in a guest sandbox"
                  className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-white px-6 py-2.5 text-sm md:text-base font-semibold text-sky-700 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 text-center leading-snug"
                  title="Guest sandbox workspaces reset after each session"
                >
                  See how it works
                </Link> */}

                {/* Tertiary: Learn more */}
                <Link
                  to="/learn-more"
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Learn more
                </Link>
              </div>
            </div>
            {/* <p className="mt-2 text-xs text-slate-500 text-center md:text-right">
              Guest sandbox workspaces are isolated and reset after each session.
            </p> */}
          </div>
        </section>
      )}
    </div>
  );
}
