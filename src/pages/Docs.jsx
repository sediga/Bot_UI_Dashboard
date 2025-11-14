// pages/Docs.jsx
import React from "react";
import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";
import HelpCenter from "../components/HelpCenter";
import VideoHelpLibrary from "../components/VideoHelpLibrary";

export default function Docs() {
  const scrollToVideoLibrary = () => {
    const el = document.getElementById("video-help-library");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />

            {/* Centered link to jump to videos */}
            <div className="flex items-center justify-center mb-6">
              <button
                type="button"
                onClick={scrollToVideoLibrary}
                className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 underline"
              >
                Jump to Video Help Library
              </button>
            </div>

            <HelpCenter
              title="Welcome to the Docs"
              intro="Explore the essentials: install, record, replay, schedule, import/export data, and troubleshoot."
              primaryCta={{ label: "Get Started", href: "/signup" }}
              secondaryCta={{ label: "Contact Support", href: "/contact" }}
              showSideNav
            />

            {/* Video Help Library */}
            <section id="video-help-library" className="mt-12">
              <div className="flex items-center justify-between mb-4">
                {/* Back to top link */}
                <button
                  type="button"
                  onClick={scrollToTop}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline"
                >
                  Back to top
                </button>
              </div>

              <VideoHelpLibrary />
            </section>
          </SectionWithBackground>

          <div className="[&>footer]:mt-0">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
