import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";

export default function DesignPartnerLearnMore() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      q: "Who can join the program?",
      a: "Anyone is welcome: individuals, startups, and teams across industries. If you repeat web tasks or move data between portals/apps, you’re a great fit.",
    },
    {
      q: "Is there a cost to join?",
      a: "Joining is free during the program. Founding partners may receive credits and preferential pricing after launch.",
    },
    {
      q: "Do I need to write code?",
      a: "No. Record once, replay reliably, and schedule runs without code. Add variables and simple logic only if you want.",
    },
    {
      q: "How is my data secured?",
      a: "Credentials can stay local via the Flowtra Agent. Encryption in transit/at rest for cloud runs; least-privilege, and no secrets stored without consent.",
    },
    {
      q: "What’s expected from partners?",
      a: "Share real workflows, provide feedback in short sessions, and tell us what’s missing. That’s it—no heavy lift.",
    },
    {
      q: "How long does it run?",
      a: "Typical cohorts run ~8–12 weeks. You can continue in early-access or become a reference customer afterward.",
    },
  ];

  return (
<div style={{ paddingTop: "var(--header-offset)" }}>  
    <div className="flex flex-col ">

    <main className="flex-grow">
       <SectionWithBackground>
        <TopBanner />
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight">
            Flowtra Design Partner Program
          </h1>
          <p className="mt-4 text-slate-600 text-lg max-w-3xl">
            Learn how the program works, what you get, and how to make the most of your
            partnership. Anyone can join and help shape Flowtra’s roadmap.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/join-design-partner"
              className="rounded-xl bg-sky-700 px-5 py-3 text-white font-medium hover:bg-sky-600"
            >
              Join as Design Partner
            </Link>
            <a
              href="#faq"
              className="rounded-xl border border-slate-300 px-5 py-3 text-slate-800 font-medium hover:bg-slate-50"
            >
              Jump to FAQs
            </a>
          </div>
        </div>
      </section>

      {/* Body with side anchors */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-[220px_1fr] gap-8">
        {/* Side nav (desktop) */}
        <nav className="hidden md:block sticky top-28 self-start">
          <ul className="text-sm text-slate-700 space-y-2">
            <li><a href="#what" className="hover:text-slate-900">What is Flowtra?</a></li>
            <li><a href="#how" className="hover:text-slate-900">How it works</a></li>
            <li><a href="#capabilities" className="hover:text-slate-900">Key capabilities</a></li>
            <li><a href="#who" className="hover:text-slate-900">Who it’s for</a></li>
            <li><a href="#security" className="hover:text-slate-900">Security & privacy</a></li>
            <li><a href="#usecases" className="hover:text-slate-900">Example use cases</a></li>
            <li><a href="#program" className="hover:text-slate-900">Program details</a></li>
            <li><a href="#timeline" className="hover:text-slate-900">Timeline</a></li>
            <li><a href="#faq" className="hover:text-slate-900">FAQs</a></li>
          </ul>
        </nav>

        {/* Main content */}
        <div className="space-y-12">
          <Section id="what" title="What is Flowtra?">
            <p className="text-slate-700">
              Flowtra helps you <b>record</b> a browser workflow once, then <b>replay</b> and
              <b> schedule</b> it—no code required. Perfect for repetitive portal tasks, data pulls,
              and moving information between web apps.
            </p>
          </Section>

          <Section id="how" title="How it works">
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              <Card title="Record" desc="Click through once; we capture robust steps and stable selectors." />
              <Card title="Replay" desc="Run on demand, iterate CSV rows, and export results." />
              <Card title="Schedule" desc="Kick off overnight and wake up to ready-to-use data." />
            </div>
          </Section>

          <Section id="capabilities" title="Key capabilities">
            <ul className="mt-3 grid md:grid-cols-2 gap-3 text-slate-700">
              <Li>Smart selectors with fallback & recovery</Li>
              <Li>Variables & prompts for dynamic inputs</Li>
              <Li>CSV import/export; row-by-row actions</Li>
              <Li>Frames, dialogs, multi-step forms</Li>
              <Li>Local or cloud runs; scheduling</Li>
              <Li>Audit trail & run history</Li>
            </ul>
          </Section>

          <Section id="who" title="Who it’s for">
            <p className="text-slate-700">
              Anyone who repeats web tasks: ops teams, analysts, founders, assistants, and more.
              Popular verticals include healthcare ops/RCM, logistics, recruiting, and finance ops—
              but the program is open to all.
            </p>
          </Section>

          <Section id="security" title="Security & privacy">
            <ul className="mt-3 list-disc list-inside text-slate-700 space-y-1">
              <li>Agent-side secret storage; credentials can stay local</li>
              <li>Encryption in transit and at rest for cloud runs</li>
              <li>Principle of least privilege; scoped access only</li>
              <li>No scripts or data are stored without consent</li>
            </ul>
          </Section>

          <Section id="usecases" title="Example use cases">
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-slate-700">
              <Case title="Portal status checks" desc="Nightly checks over claims/tickets/requests with CSV output by morning." />
              <Case title="Mass form fill" desc="Take a CSV and loop through rows to submit forms, update records, or trigger actions." />
              <Case title="Partner/vendor portals" desc="Log in, pull reports, and normalize data across third-party sites." />
              <Case title="Internal tooling glue" desc="Move data between tools when APIs are limited or unavailable." />
            </div>
          </Section>

          <Section id="program" title="Program details — what you get">
            <ul className="mt-3 grid md:grid-cols-2 gap-3 text-slate-700">
              <Li>Early access & roadmap influence</Li>
              <Li>Dedicated setup help & support</Li>
              <Li>Templates & best practices for common flows</Li>
              <Li>Preferential pricing after launch</Li>
            </ul>
          </Section>

          <Section id="timeline" title="Timeline">
            <ol className="mt-3 list-decimal list-inside text-slate-700 space-y-1">
              <li>Week 0–1: Kickoff & onboarding call</li>
              <li>Week 1–3: First workflow recorded and replayed</li>
              <li>Week 3–6: Iterate on reliability; add variables/CSV</li>
              <li>Week 6–8: Schedule overnight runs; review outcomes</li>
            </ol>
          </Section>

          <Section id="faq" title="FAQs">
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((f, i) => (
                <button
                  key={i}
                  className="w-full text-left py-4 focus:outline-none"
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  aria-expanded={openFAQ === i}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{f.q}</span>
                    <span className="text-slate-500">{openFAQ === i ? "−" : "+"}</span>
                  </div>
                  {openFAQ === i && (
                    <div className="mt-2 text-slate-700 text-sm">{f.a}</div>
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* CTA */}
          <section className="rounded-2xl border border-slate-200 p-6 bg-slate-50/60">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Ready to join?</h3>
                <p className="text-slate-700 mt-1">Join in a minute. No commitment required.</p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/join-design-partner" className="rounded-xl bg-sky-700 px-5 py-3 text-white font-medium hover:bg-sky-600">
                  Join as Design Partner
                </Link>
                <a href="#" className="rounded-xl border border-slate-300 px-5 py-3 text-slate-800 font-medium hover:bg-slate-50">
                  Back to overview
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SectionWithBackground>
        {/* Footer row — override ONLY here to cancel its internal mt-10 */}    
        <div className="[&>footer]:mt-0">
            <Footer />
        </div>
    </main>
    </div>
</div>
  );
}

/* --- helpers --- */

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Card({ title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 bg-white">
      <div className="font-semibold">{title}</div>
      <div className="text-slate-600 text-sm mt-1">{desc}</div>
    </div>
  );
}

function Case({ title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 bg-white">
      <div className="font-semibold">{title}</div>
      <div className="text-slate-600 text-sm mt-1">{desc}</div>
    </div>
  );
}

function Li({ children }) {
  return <li className="rounded-xl border border-slate-200 p-3">{children}</li>;
}
