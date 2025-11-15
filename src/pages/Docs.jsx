// pages/Docs.jsx
import React from "react";
import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";
import HelpCenter from "../components/HelpCenter";
import VideoHelpLibrary from "../components/VideoHelpLibrary";

export default function Docs() {
  const scrollToSection = (id) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />

            {/* HERO: Help Center + Video spotlight */}
            <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <div className="max-w-6xl mx-auto px-6 py-10 md:py-14 grid gap-10 md:grid-cols-[minmax(0,3fr),minmax(0,2.5fr)] items-center">
                {/* Left: copy + quick steps */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                    Flowtra Help Center
                  </h1>
                  <p className="mt-4 text-slate-600 text-lg max-w-3xl">
                    The fastest way to learn Flowtra: watch a short overview,
                    then dive into step-by-step guides for installation,
                    recording, smart steps, secrets, and scheduling.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => scrollToSection("video-help-library")}
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-white font-medium hover:bg-indigo-700"
                    >
                      Watch 3-min overview
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection("docs-root")}
                      className="rounded-xl border border-slate-300 px-5 py-3 text-slate-800 font-medium hover:bg-slate-50"
                    >
                      Browse step-by-step docs
                    </button>
                  </div>

                  <div className="mt-6">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Quick start at a glance
                    </h2>
                    <ol className="mt-2 text-sm text-slate-700 space-y-1 list-decimal list-inside">
                      <li>Sign up or log in at <code>flowtra.app</code>.</li>
                      <li>Install the Flowtra Agent on your Windows machine.</li>
                      <li>Click <b>Record</b>, perform your workflow once.</li>
                      <li>Save, replay, and fix any steps if needed.</li>
                      <li>Schedule runs so results are ready by morning.</li>
                    </ol>
                  </div>
                </div>

                {/* Right: video spotlight card */}
                <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="aspect-video w-full bg-slate-100">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/qIYDk1huaKE"
                      title="Getting Started: Sign Up and First Flow"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-sm font-medium text-slate-900">
                      Getting Started: Sign Up and First Flow
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      ~3 minutes • Signing up, creating your first Flow, and overview of the dashboard.
                    </p>
                    <button
                      type="button"
                      onClick={() => scrollToSection("video-help-library")}
                      className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Browse the full video library
                    </button>
                  </div>
                </aside>
              </div>
            </section>

            {/* VIDEO LIBRARY – now high on the page */}
            <section
              id="video-help-library"
              className="bg-slate-50/80 border-b border-slate-100"
            >
              <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
                <VideoHelpLibrary />
              </div>
            </section>

            {/* TEXT DOCS / HELP CENTER */}
            <section id="docs-root" className="bg-white">
              <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
                <HelpCenter />
              </div>
            </section>

            {/* Back-to-top helper for users who scroll to the very end */}
            <div className="max-w-7xl mx-auto px-6 pb-10 flex justify-end">
              <button
                type="button"
                onClick={scrollToTop}
                className="text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Back to top
              </button>
            </div>
          </SectionWithBackground>

          <div className="[&>footer]:mt-0">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
