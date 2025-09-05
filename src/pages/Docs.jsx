// pages/Docs.jsx
import React from "react";
import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";
import HelpCenter from "../components/HelpCenter";

export default function Docs() {
  return (
    <div style={{ paddingTop: "var(--header-offset)", paddingBottom: "var(--footer-offset)" }}>
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />
            <HelpCenter
              title="Welcome to the Docs"
              intro="Explore the essentials: install, record, replay, schedule, import/export data, and troubleshoot."
              primaryCta={{ label: "Get Started", href: "/signup" }}
              secondaryCta={{ label: "Contact Support", href: "/contact" }}
              showSideNav
              // extraSections={[{ id: "integrations", title: "Integrations", content: <div>…</div> }]}
              // faqs={[{ q: "Custom Q", a: "Custom A" }]}
            />
            <div className="[&>footer]:mt-0">
              <Footer />
            </div>
          </SectionWithBackground>

        </main>
      </div>
    </div>
  );
}
