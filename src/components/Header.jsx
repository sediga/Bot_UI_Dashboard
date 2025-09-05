import React, { useEffect, useRef } from "react";

const Header = () => {
  const ref = useRef(null);

  // Measure header height (incl. banner) and expose as CSS var
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty(
        "--header-offset",
        `${el.offsetHeight}px`
      );
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-100"
    >
      {/* Top bar (logo / nav / auth) */}
      <header className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-gray-800">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Flowtra logo" className="h-8 w-8" />
          <span className="text-xl font-semibold tracking-tight">Flowtra</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
          <a href="#why" className="hover:text-slate-900">Why Flowtra</a>
          <a href="#how" className="hover:text-slate-900">How it works</a>
          <a href="#partners" className="hover:text-slate-900">Ideal partners</a>
          <a href="#apply" className="hover:text-slate-900">Apply</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/login" className="hidden sm:inline text-sm text-slate-700 hover:text-slate-900">Log In</a>
          <a href="/signup" className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-500">
            Sign Up
          </a>
        </div>
      </header>

      {/* Design Partner ribbon (inside header) */}
      <section className="w-full bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-base md:text-lg font-semibold text-slate-900">
                Shape the future of Flowtra
              </h2>
              <p className="mt-0.5 text-slate-600 text-sm md:text-base">
                We’re inviting billing, credentialing, and RCM teams to join our Design Partner program.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/design-partner"
                className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-white text-sm md:text-base font-medium hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                Join as Design Partner
              </a>
              <a
                href="/design-partner#why"
                className="hidden md:inline text-sky-700 hover:text-sky-800 text-sm font-medium"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Header;
