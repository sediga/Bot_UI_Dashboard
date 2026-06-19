import React, { useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function TopBanner({
  hideRibbon = true,
  showMenu = true,
  brandTitle,
  brandSubtitle,
  brandEyebrow,
  brandImageSrc,
  brandImageAlt,
  brandImageClassName,
  brandImageOverlayText,
  fixed = true,
}) {
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(
        "--header-offset",
        fixed ? `${el.offsetHeight}px` : "0px"
      );
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [fixed]);

  return (
    <div
      ref={ref}
      className={`inset-x-0 z-50 border-b border-slate-100 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-white/60 ${
        fixed ? "fixed top-0" : "relative"
      }`}
      role="banner"
      aria-label="Flowtra header"
    >
      <section className="w-full">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-start">
            <div className="flex flex-col justify-center">
              <div
                className="flex cursor-pointer items-center space-x-4"
                onClick={() => navigate("/")}
                >
                  {brandImageSrc ? (
                    <div className="relative inline-block">
                      <img
                        src={brandImageSrc}
                        alt={brandImageAlt || "Brand logo"}
                        className={
                          brandImageClassName ||
                          "h-20 w-auto max-w-[460px] object-contain"
                        }
                      />
                      {brandImageOverlayText && (
                        <div className="pointer-events-none absolute bottom-[10%] right-[7%] rounded-full border border-cyan-200/70 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800 shadow-sm backdrop-blur sm:text-[11px]">
                          {brandImageOverlayText}
                        </div>
                      )}
                    </div>
                  ) : (
                  <>
                    <img
                      src="/assets/logo.png"
                      alt="Flowtra Logo"
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <div className="text-4xl font-bold leading-tight tracking-tight text-gray-800 sm:text-5xl">
                        {brandTitle || (
                          <>
                            Flowtra<span className="text-indigo-500">.app</span>
                          </>
                        )}
                      </div>
                      {brandEyebrow && (
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                          {brandEyebrow}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              {(brandSubtitle || !brandImageSrc) && (
                <p className="mt-2 text-sm leading-tight text-gray-600 sm:text-base">
                  {brandSubtitle ||
                    "Turn repetitive portal work into reliable flows without an IT project."}
                </p>
              )}
            </div>
          </div>

          {showMenu && (
            <div className="flex flex-wrap gap-3">
              <Link
                to="/in/healthcare"
                className="rounded-lg border border-emerald-300 px-4 py-2 font-medium text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Healthcare
              </Link>

              <Link
                to="/learn-more"
                aria-label="Learn about the Flowtra Design Partner program"
                className="rounded-lg border border-sky-300 px-4 py-2 font-medium text-sky-700 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                Bring us a workflow
              </Link>

              <Link
                to="/login"
                className="rounded-lg bg-sky-500 px-6 py-2 font-medium text-white transition hover:bg-sky-600"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-800 transition hover:bg-gray-100"
              >
                Sign Up
              </Link>
              <Link
                to="/docs"
                className="rounded-lg bg-violet-600 px-6 py-2 font-medium text-white transition hover:bg-violet-700"
              >
                Help Center
              </Link>
            </div>
          )}
        </div>
      </section>

      {!hideRibbon && (
        <section className="w-full border-t border-slate-200 bg-gradient-to-r from-sky-50 via-white to-slate-50">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="text-center md:text-left">
                <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                  Reliable execution for portal-heavy work
                </h2>
                <p className="mt-0.5 text-sm text-slate-600 md:text-base">
                  We work hands-on with healthcare teams to take repetitive work
                  out of external portals by turning real workflows into reliable
                  flows that run.
                </p>
              </div>

              <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row md:mt-0">
                <Link
                  to="/join-design-partner"
                  aria-label="Get started as a Flowtra Design Partner"
                  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-center text-sm font-semibold leading-snug text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 md:text-base"
                >
                  Bring us a workflow
                </Link>

                <Link
                  to="/learn-more"
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
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
