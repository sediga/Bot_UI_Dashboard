// pages/JoinDesignPartnerPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";
import config from "../config";

// Join as Design Partner — standalone page component
export default function JoinDesignPartnerPage() {
  const [state, setState] = useState({ loading: false, ok: false, err: "" });
  const token = localStorage.getItem("botflows_token");

  const utm = useMemo(() => {
    if (typeof window === "undefined") return {};
    const p = new URLSearchParams(window.location.search);
    return {
      source: p.get("utm_source") || "",
      medium: p.get("utm_medium") || "",
      campaign: p.get("utm_campaign") || "",
      term: p.get("utm_term") || "",
      content: p.get("utm_content") || "",
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setState({ loading: true, ok: false, err: "" });

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Honeypot (bots fill hidden field)
    if (fd.get("companyFax")) {
      setState({ loading: false, ok: true, err: "" });
      return;
    }

    // Basic required fields
    const required = ["name", "email", "consent"];
    for (const key of required) {
      const v = fd.get(key);
      if (!v || (key === "consent" && v !== "on")) {
        setState({
          loading: false,
          ok: false,
          err: `Please complete the required field: ${key}.`,
        });
        return;
      }
    }

    const payload = {
      name: fd.get("name")?.toString().trim(),
      email: fd.get("email")?.toString().trim(),
      company: fd.get("company")?.toString().trim(),
      role: fd.get("role")?.toString().trim(),
      website: fd.get("website")?.toString().trim(),
      use_case: fd.get("use_case")?.toString().trim(),
      portals: fd.get("portals")?.toString().trim(),
      team_size: fd.get("team_size")?.toString().trim(),
      timeline: fd.get("timeline")?.toString().trim(),
      industry: fd.get("industry")?.toString().trim(),
      hear_about: fd.get("hear_about")?.toString().trim(),
      nda_ok: fd.get("nda_ok") === "on",
      notes: fd.get("notes")?.toString().trim(),
      consent: fd.get("consent") === "on",
      utm,
    };

    try {
      const res = await fetch(`${config.apiBaseUrl}/api/DesignPartner/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      setState({ loading: false, ok: true, err: "" });
    } catch (err) {
      setState({
        loading: false,
        ok: false,
        err: err?.message || "Submission failed. Please try again.",
      });
    }
  }

  if (state.ok) return <SuccessScreen />;

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="flex flex-col">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />

            {/* Hero */}
            <section className="bg-gradient-to-b from-slate-50 to-white">
              <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
                <h1 className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight">
                  Tell us about the workflow you want off your plate
                  <span className="inline-block ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full align-middle">
                    Not sure yet?&nbsp;
                    <Link to="/learn-more" className="underline">
                      See how teams usually get started.
                    </Link>
                  </span>
                </h1>
                <p className="mt-4 text-slate-600 text-lg max-w-3xl">
Most teams come to Flowtra with one or two portal workflows that are taking too much time and attention.

Share what you’d like to automate, and we’ll design and run your first production flow as a free pilot. If it clearly saves time, we’ll agree on a simple ongoing plan.                </p>
              </div>
            </section>

            {/* Form */}
            <section className="mx-auto max-w-5xl px-6 py-10">
              <form onSubmit={handleSubmit} className="grid gap-6">
                {/* Honeypot */}
                <input
                  name="companyFax"
                  className="hidden"
                  autoComplete="off"
                  tabIndex={-1}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Full name" required>
                    <input
                      name="name"
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="Ada Lovelace"
                    />
                  </Field>
                  <Field label="Work email" required>
                    <input
                      name="email"
                      required
                      type="email"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="you@company.com"
                    />
                  </Field>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Company / Org">
                    <input
                      name="company"
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="Org name (optional)"
                    />
                  </Field>
                  <Field label="Role">
                    <input
                      name="role"
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="Ops Lead, Founder, Analyst…"
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      name="website"
                      type="url"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="https://example.com"
                    />
                  </Field>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Field label="Primary portals or apps">
                    <input
                      name="portals"
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="e.g., payer portal, NPI, CAQH, vendor portal"
                    />
                  </Field>
                  <Field label="Team size">
                    <select
                      name="team_size"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                    >
                      <option value="">Select…</option>
                      <option>Just me</option>
                      <option>2–5</option>
                      <option>6–20</option>
                      <option>21–50</option>
                      <option>51–200</option>
                      <option>200+</option>
                    </select>
                  </Field>
                </div>

                <Field label="What would you like to automate first?">
                  <textarea
                    name="use_case"
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                    placeholder="Describe your workflow, the portals involved, what your team does today, and what a 'win' would look like."
                  />
                </Field>

                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Industry">
                    <input
                      name="industry"
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="Healthcare, RCM, SaaS product, etc."
                    />
                  </Field>
                  <Field label="Timeline">
                    <select
                      name="timeline"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                    >
                      <option value="">Select…</option>
                      <option>ASAP</option>
                      <option>This month</option>
                      <option>Next quarter</option>
                      <option>Just exploring</option>
                    </select>
                  </Field>
                  <Field label="How did you hear about us?">
                    <input
                      name="hear_about"
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                      placeholder="Friend, LinkedIn, search, etc."
                    />
                  </Field>
                </div>

                <Field label="Anything else we should know?">
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-600/10"
                    placeholder="Constraints, security needs, existing bots, fragile workflows, or success metrics…"
                  />
                </Field>

                <div className="grid md:grid-cols-2 gap-6">
                  <label className="flex items-start gap-3">
                    <input
                      name="nda_ok"
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      Happy to sign an NDA if needed
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input
                      name="consent"
                      required
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">
                      I agree to be contacted about my workflow and related updates.
                    </span>
                  </label>
                </div>

                {/* Optional reCAPTCHA slot */}
                <div className="hidden" aria-hidden>
                  <div id="captcha-placeholder" />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={state.loading}
                    className="rounded-xl bg-sky-700 px-5 py-3 text-white font-medium hover:bg-sky-600 disabled:opacity-60"
                  >
                    {state.loading ? "Submitting…" : "Submit"}
                  </button>
                  {state.err && (
                    <span className="text-sm text-rose-600">{state.err}</span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto">
                    By submitting, you agree to our{" "}
                    <Link to="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </div>
              </form>
            </section>
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

function Field({ label, required, children }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-800">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

function SuccessScreen() {
  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="flex flex-col">
        <main className="flex-grow">
          <SectionWithBackground>
            <TopBanner />
            <div className="text-center mx-auto max-w-2xl px-6 py-56 md:py-64">
              <div className="text-3xl font-semibold">Thanks for getting started!</div>
              <p className="mt-3 text-slate-600">
                We received your details and will reach out shortly to review your workflows
                and confirm whether this cohort is a good fit. Keep an eye on your inbox.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  to="/"
                  className="rounded-xl border border-slate-300 px-4 py-2 hover:bg-slate-50"
                >
                  Back to Home
                </Link>
                <Link
                  to="/docs"
                  className="rounded-xl bg-sky-700 px-4 py-2 text-white hover:bg-sky-600"
                >
                  Explore Docs
                </Link>
              </div>
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
