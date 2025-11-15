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
      a: "Our primary focus is healthcare revenue cycle and credentialing teams that live in payer, NPI, and CAQH portals. If your staff is repeating the same portal steps daily or weekly, you’re a great fit.",
    },
    {
      q: "Is there a cost to join?",
      a: "Yes. This is a paid early-access program where we design, build, and maintain 1–2 critical workflows for you. Design Partner pricing is discounted and locked in for the life of your account. Exact fees are scoped together on the intro call.",
    },
    {
      q: "Do I need to write code?",
      a: "No. We build and maintain the flows for you. You can view and adjust steps in the Flowtra dashboard if you’d like, but you never have to write code.",
    },
    {
      q: "How is my data secured?",
      a: "Flows run through the Flowtra Agent on your desktop or server, so credentials can stay local. Data is encrypted in transit, and we only store what’s required for automation. We never retain PHI without explicit agreement.",
    },
    {
      q: "What’s expected from partners?",
      a: "You bring real workflows, a point-of-contact who can walk us through them, and 30–60 minutes every few weeks for feedback. We handle design, implementation, and keeping flows running when portals change.",
    },
    {
      q: "How long does it run?",
      a: "Most teams see their first workflow automated within 2–4 weeks. A typical design-partner engagement runs 8–12 weeks, after which you can continue on standard early-access pricing.",
    },
  ];

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="flex flex-col">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />

            {/* Hero */}
            <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                <h1 className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight">
                  Flowtra Design Partner Program for RCM & Credentialing Teams
                </h1>
                <p className="mt-4 text-slate-600 text-lg max-w-3xl">
                  We work with a small number of billing and credentialing teams
                  to automate high-volume portal work like NPI lookups, CAQH
                  checks, and payer status sweeps. Design Partners get hands-on
                  setup, priority support, and locked-in early-access pricing.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/join-design-partner"
                    className="rounded-xl bg-sky-700 px-5 py-3 text-white font-medium hover:bg-sky-600"
                  >
                    Apply to be a Design Partner
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
                  <li>
                    <a href="#what" className="hover:text-slate-900">
                      What is Flowtra?
                    </a>
                  </li>
                  <li>
                    <a href="#how" className="hover:text-slate-900">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#capabilities" className="hover:text-slate-900">
                      Key capabilities
                    </a>
                  </li>
                  <li>
                    <a href="#who" className="hover:text-slate-900">
                      Who it’s for
                    </a>
                  </li>
                  <li>
                    <a href="#security" className="hover:text-slate-900">
                      Security & privacy
                    </a>
                  </li>
                  <li>
                    <a href="#usecases" className="hover:text-slate-900">
                      Example use cases
                    </a>
                  </li>
                  <li>
                    <a href="#program" className="hover:text-slate-900">
                      Program details
                    </a>
                  </li>
                  <li>
                    <a href="#timeline" className="hover:text-slate-900">
                      Timeline
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-slate-900">
                      FAQs
                    </a>
                  </li>
                </ul>
              </nav>

              {/* Main content */}
              <div className="space-y-12">
                <Section id="what" title="What is Flowtra?">
                  <p className="text-slate-700">
                    Flowtra helps you <b>record</b> a browser workflow once,
                    then <b>replay</b> and <b>schedule</b> it—without code.
                    It’s built for repetitive portal tasks like checking claim
                    status, verifying NPIs, stepping through CAQH rosters, and
                    moving data between payer portals and your internal systems.
                  </p>
                </Section>

                <Section id="how" title="How it works">
                  <div className="mt-6 grid md:grid-cols-3 gap-6">
                    <Card
                      title="Record"
                      desc="Walk through the portal once; Flowtra captures stable steps and selectors instead of fragile coordinates."
                    />
                    <Card
                      title="Replay"
                      desc="Run flows on demand, loop over CSV rows, and push results into files or downstream systems."
                    />
                    <Card
                      title="Schedule"
                      desc="Run flows overnight or on a schedule so staff walk in to ready-to-work lists each morning."
                    />
                  </div>
                </Section>

                <Section id="capabilities" title="Key capabilities">
                  <ul className="mt-3 grid md:grid-cols-2 gap-3 text-slate-700">
                    <Li>Smart selectors with fallback & recovery</Li>
                    <Li>CSV import/export and row-by-row actions</Li>
                    <Li>Support for multi-step forms, dialogs, and grids</Li>
                    <Li>Variables & parameter mapping for dynamic fields</Li>
                    <Li>Local agent runs; optional cloud orchestration</Li>
                    <Li>Run history and logs for audits and triage</Li>
                  </ul>
                </Section>

                <Section id="who" title="Who it’s for">
                  <p className="text-slate-700">
                    The program is designed for healthcare revenue cycle,
                    billing, and credentialing teams that spend hours inside
                    payer portals, the NPI registry, and CAQH. If your staff is
                    manually checking statuses, copying values into
                    spreadsheets, or submitting the same forms over and over,
                    you’re exactly who we built this for.
                  </p>
                </Section>

                <Section id="security" title="Security & privacy">
                  <ul className="mt-3 list-disc list-inside text-slate-700 space-y-1">
                    <li>
                      Flowtra Agent can run on your own desktop or server so
                      credentials stay local.
                    </li>
                    <li>
                      Encryption in transit and at rest for any data sent to
                      Flowtra services.
                    </li>
                    <li>
                      Principle of least privilege: we only request the access
                      needed for your flows.
                    </li>
                    <li>
                      No PHI or sensitive data is stored without explicit
                      agreement and documented purpose.
                    </li>
                  </ul>
                </Section>

                <Section id="usecases" title="Example use cases">
                  <div className="mt-4 grid md:grid-cols-2 gap-4 text-slate-700">
                    <Case
                      title="NPI bulk verification"
                      desc="Load a CSV of providers, search the NPI registry for each row, and export cleaned NPI data back to a file."
                    />
                    <Case
                      title="CAQH roster checks"
                      desc="Log into CAQH, step through your roster, and export status, re-attestation dates, and missing items for follow-up."
                    />
                    <Case
                      title="Payer claim status sweeps"
                      desc="Nightly claim status checks across payer portals with a morning CSV of claims that need follow-up."
                    />
                    <Case
                      title="Portal-to-system bridge"
                      desc="Copy key values from payer or registry portals into your internal tools when APIs are missing or limited."
                    />
                  </div>
                </Section>

                <Section id="program" title="Program details — what you get">
                  <ul className="mt-3 grid md:grid-cols-2 gap-3 text-slate-700">
                    <Li>Early access and direct input into the roadmap</Li>
                    <Li>
                      Hands-on design and implementation of 1–2 critical
                      workflows
                    </Li>
                    <Li>
                      Monitoring and updates when payer or registry portals
                      change
                    </Li>
                    <Li>
                      Discounted, locked-in pricing for Design Partner accounts
                    </Li>
                  </ul>
                </Section>

                <Section id="timeline" title="Timeline">
                  <ol className="mt-3 list-decimal list-inside text-slate-700 space-y-1">
                    <li>Week 0–1: Intro call, workflow selection, and setup</li>
                    <li>
                      Week 1–3: First workflow recorded, replayed, and validated
                      on your data
                    </li>
                    <li>
                      Week 3–6: Hardening and reliability tuning; add CSV
                      loops/variables
                    </li>
                    <li>
                      Week 6–8: Scheduling, handoff, and review of time saved
                    </li>
                  </ol>
                </Section>

                <Section id="faq" title="FAQs">
                  <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                    {faqs.map((f, i) => (
                      <button
                        key={i}
                        className="w-full text-left py-4 focus:outline-none"
                        onClick={() =>
                          setOpenFAQ(openFAQ === i ? null : i)
                        }
                        aria-expanded={openFAQ === i}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">
                            {f.q}
                          </span>
                          <span className="text-slate-500">
                            {openFAQ === i ? "−" : "+"}
                          </span>
                        </div>
                        {openFAQ === i && (
                          <div className="mt-2 text-slate-700 text-sm">
                            {f.a}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* CTA */}
                <section className="rounded-2xl border border-slate-200 p-6 bg-slate-50/60">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        Ready to see if we’re a fit?
                      </h3>
                      <p className="text-slate-700 mt-1">
                        Apply in a minute. We’ll review your workflows and
                        confirm whether the Design Partner program is a good
                        match.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to="/join-design-partner"
                        className="rounded-xl bg-sky-700 px-5 py-3 text-white font-medium hover:bg-sky-600"
                      >
                        Apply to be a Design Partner
                      </Link>
                      <a
                        href="#what"
                        className="rounded-xl border border-slate-300 px-5 py-3 text-slate-800 font-medium hover:bg-slate-50"
                      >
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
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {title}
      </h2>
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
