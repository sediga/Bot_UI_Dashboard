import React from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";

const todayCapabilities = [
  {
    title: "Pre-auth intelligence",
    body:
      "Guided filing support for cashless cases, payer checklists, document completeness, and IHX submission assistance.",
  },
  {
    title: "IHX + TPA interaction intelligence",
    body:
      "Queries, approvals, follow-ups, and inbox activity become patient-linked work instead of scattered portal updates and emails.",
  },
  {
    title: "Document reading intelligence",
    body:
      "Referral notes, insurance cards, approval letters, reports, and attachments are read and turned into usable insurance context.",
  },
  {
    title: "Role-based actioning",
    body:
      "Doctor, insurance desk, billing desk, and supervisor each see the right alert instead of every problem landing on one team.",
  },
];

const platformLayers = [
  "Revenue Command Center for hospital-wide insured-case visibility",
  "Shared patient revenue file across insurance, doctor, billing, and admin desks",
  "Action-ready case workspace with next-step guidance and evidence tracking",
  "Revenue-risk intelligence for uncovered treatment, approval mismatch, and discharge readiness",
  "Hospital memory that learns payer habits, document gaps, and query patterns over time",
];

const roleCards = [
  {
    role: "Insurance desk",
    points: [
      "Owns pre-auth, IHX activity, and TPA response workflow",
      "Sees pending queries, missing documents, and follow-up pressure early",
      "Coordinates the final evidence pack instead of chasing every desk manually",
    ],
  },
  {
    role: "Doctor / consultant",
    points: [
      "Gets pulled in only when clinical input is actually needed",
      "Adds justification, referral context, or diagnosis clarification faster",
      "Avoids being flooded with non-clinical insurance noise",
    ],
  },
  {
    role: "Billing desk",
    points: [
      "Tracks approval mismatch, tariff impact, and uncovered treatment changes",
      "Flags shortfall and bill risk before final clearance pressure begins",
      "Builds the financial position while the case is still moving",
    ],
  },
  {
    role: "Supervisor",
    points: [
      "Sees aging cases, pending approvals, and tomorrow's discharge-risk watchlist",
      "Escalates only when needed, with case context already attached",
      "Gets a clearer view of revenue friction across desks",
    ],
  },
];

const roadmapPhases = [
  {
    phase: "Today",
    title: "Focused insurance workflow intelligence",
    body:
      "Flowtra already helps with pre-auth support, IHX and TPA monitoring, case-linked documents, role alerts, and early risk detection.",
  },
  {
    phase: "Next",
    title: "Coordinated multi-desk workflow",
    body:
      "The same case becomes shared work across insurance, billing, doctor, and admin desks with one patient-linked file and one interaction queue.",
  },
  {
    phase: "Platform",
    title: "Hospital-wide revenue intelligence",
    body:
      "Flowtra grows into a complete operating layer around insured patient workflows: command center, predictions, local learning, and reusable institutional memory.",
  },
];

const useCases = [
  "A referral note arrives. Flowtra reads it, detects likely clinical justification need, and prompts staff before filing.",
  "A TPA asks to justify ICU stay beyond 3 days. Insurance, doctor, and billing each receive the right part of the work.",
  "Discharge is expected tomorrow. Pending query, approval mismatch, and missing evidence are surfaced before clearance pressure starts.",
  "A hospital learns that a payer repeatedly asks for the same reports in cardiac cases. Future checklists improve automatically.",
];

export default function HealthcareIndiaPage() {
  return (
    <div>
      <div className="flex min-h-screen flex-col">
        <main className="flex-grow">
          <SectionWithBackground>
            <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_52%,_#f8fafc_100%)]">
              <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_rgba(15,23,42,0.96)_58%,_rgba(2,6,23,1)_100%)] p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.8)] sm:p-8">
                  <img
                    src="/assets/flowtra-healthcare-hero.png"
                    alt="Flowtra Healthcare brand banner with the tagline Reducing Delays. Preventing Leakage. Enabling Seamless Discharge."
                    className="mx-auto h-auto max-h-[460px] w-full max-w-5xl object-contain"
                  />
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-8 lg:py-16">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    Flowtra Healthcare For Indian Hospitals
                  </p>
                  <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-5xl">
                    One revenue-intelligence layer across the insured patient journey.
                  </h1>
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
                    Flowtra helps hospitals protect insurance revenue from admission to
                    discharge by connecting pre-auth, IHX activity, TPA communication,
                    case documents, billing risk, and role-based intelligence into one
                    coordinated workflow.
                  </p>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                    It starts with the real friction Indian hospitals face today in
                    cashless workflows. Over time, it grows into a complete platform
                    for coordinated revenue intelligence across desks, cases, and
                    hospital learning.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      to="/join-design-partner"
                      className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
                    >
                      Book a hospital workflow review
                    </Link>
                    <a
                      href="#today"
                      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      See what Flowtra does today
                    </a>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <StatCard value="Pre-auth to discharge" label="Coverage across the insured-patient journey" />
                    <StatCard value="IHX + TPA + docs" label="Insurance interactions linked back to the case" />
                    <StatCard value="One case, many desks" label="Insurance, billing, doctor, and supervisor coordination" />
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-semibold text-slate-900">
                      The problem Flowtra is built for
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      Discharge delay is the visible symptom. The hidden cause usually
                      starts much earlier: missing documents, IHX friction, TPA queries,
                      approval mismatch, uncovered treatment changes, and handoffs
                      across billing, insurance, and clinical teams.
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <MiniSignal
                      title="Pending TPA clarification"
                      desc="Please justify ICU stay beyond 3 days."
                    />
                    <MiniSignal
                      title="Approval mismatch risk"
                      desc="Approved amount below expected bill for tomorrow's discharge."
                    />
                    <MiniSignal
                      title="Missing evidence"
                      desc="Referral note found; supporting clinical note still not attached."
                    />
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-900 px-5 py-4 text-slate-50">
                    <div className="text-sm font-semibold">Positioning</div>
                    <p className="mt-2 text-sm leading-7 text-slate-200">
                      Flowtra is not another HIS. It is the revenue-intelligence layer
                      around insured patient workflows.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-white" id="today">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                    What Flowtra Is Today
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    A practical entry point into hospital insurance revenue workflows.
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-700">
                    Flowtra begins with the highest-friction part of the Indian
                    insured-patient journey: pre-auth, IHX activity, TPA
                    communication, case documents, and the revenue risk that builds
                    while the case is still moving.
                  </p>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {todayCapabilities.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm"
                    >
                      <div className="text-lg font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-slate-950 text-white">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                      The Journey
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                      Revenue risk starts at admission, not at discharge.
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-slate-300">
                      Flowtra follows the insured case through intake, filing,
                      approval, treatment changes, queries, final bill, and clearance
                      so hospitals can catch revenue friction earlier.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <JourneyStep number="1" title="Admission" desc="Patient, payer, diagnosis, estimate." />
                    <JourneyStep number="2" title="Insurance intake" desc="Card, policy, and case documents." />
                    <JourneyStep number="3" title="Pre-auth filing" desc="IHX and portal submission support." />
                    <JourneyStep number="4" title="Approval + conditions" desc="Amount, room type, and caveats." />
                    <JourneyStep number="5" title="Treatment evolves" desc="ICU, tests, referrals, procedures." />
                    <JourneyStep number="6" title="Query / enhancement" desc="TPA asks, evidence requests, updates." />
                    <JourneyStep number="7" title="Final bill + summary" desc="Evidence pack and billing position." />
                    <JourneyStep number="8" title="Discharge clearance" desc="Patient payable, shortfall, settlement readiness." />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-white">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                    Hospital Coordination
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    One TPA query can become coordinated hospital work.
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-slate-700">
                    Flowtra is designed for the real desks involved in Indian hospital
                    cashless workflows, so the right people see the right action with
                    the right case context.
                  </p>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-2">
                  {roleCards.map((card) => (
                    <div
                      key={card.role}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="text-xl font-semibold text-slate-900">
                        {card.role}
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                        {card.points.map((point) => (
                          <li key={point} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 flex-none rounded-full bg-sky-600" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                      Platform Vision
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                      From pre-auth assistance to a complete revenue-intelligence platform.
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-slate-700">
                      The goal is bigger than automation. Flowtra grows around the same
                      insured patient journey and becomes the operating layer around
                      patient-linked revenue coordination.
                    </p>

                    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Complete platform direction
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                        {platformLayers.map((item) => (
                          <li key={item} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {roadmapPhases.map((item, index) => (
                      <div
                        key={item.phase}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                              {item.phase}
                            </div>
                            <div className="text-lg font-semibold text-slate-900">
                              {item.title}
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-700">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-slate-200 bg-white">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
                    What This Enables
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                    Practical use cases now, institutional memory over time.
                  </h2>
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-2">
                  {useCases.map((item) => (
                    <div
                      key={item}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10 rounded-[32px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_32px_70px_-35px_rgba(15,23,42,0.8)]">
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
                        Future intelligence
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                        Every case teaches the next case.
                      </h3>
                      <p className="mt-4 text-base leading-8 text-slate-300">
                        Senior billing and insurance experience should not stay buried
                        in email threads or in one person's memory. Flowtra is aiming
                        to turn payer habits, document gaps, approval outcomes, and
                        shortfall patterns into reusable hospital intelligence.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="text-sm font-semibold text-white">
                        What the platform learns over time
                      </div>
                      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                        <li>Payer-specific document requirements and query habits</li>
                        <li>Doctor and department patterns that commonly trigger follow-up</li>
                        <li>Approval conditions that create downstream billing pressure</li>
                        <li>Which missing documents and uncovered changes delay discharge</li>
                        <li>Checklist improvements from real case outcomes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-b from-white to-slate-50">
              <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                        Start Focused
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        Start with one controlled workflow. Expand into hospital-wide revenue intelligence.
                      </h2>
                      <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                        The strongest rollout path is simple: map one live insurance
                        workflow, connect the real sources your team already uses,
                        prove value on actual cases, and expand from there.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to="/join-design-partner"
                        className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                      >
                        Bring us your hospital workflow
                      </Link>
                      <Link
                        to="/learn-more"
                        className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                      >
                        Learn how teams get started
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
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

function StatCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs leading-6 text-slate-600">{label}</div>
    </div>
  );
}

function MiniSignal({ title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{desc}</div>
    </div>
  );
}

function JourneyStep({ number, title, desc }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
        Step {number}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-slate-300">{desc}</div>
    </div>
  );
}
