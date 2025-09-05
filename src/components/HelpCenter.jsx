// pages/HelpCenterPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TopBanner from "./TopBanner";
import Footer from "./Footer";
import ReachOutPopup from "./ReachOutPopup";

// utils/scroll.js (or inline in the page file)
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function HelpCenterPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [activeId, setActiveId] = useState("quick-start");

  const nav = useMemo(() => ([
    { id: "quick-start", label: "Quick Start" },
    { id: "install", label: "Installation & Setup" },
    { id: "record", label: "Record a Workflow" },
    { id: "smart-steps", label: "Smart Steps" },
    { id: "smart-selectors", label: "Smart Selectors & AI Recovery" },
    { id: "secrets", label: "Secrets & Sensitive Data" },
    { id: "schedule", label: "Schedule & Automation" },
    { id: "troubleshooting", label: "Troubleshooting" },
  ]), []);

  // Observe sections to highlight active & wire prev/next
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // pick the section most on-screen
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.25, 0.5, 0.75, 1] }
    );
    nav.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [nav]);

  const idx = nav.findIndex((n) => n.id === activeId);
  const prev = idx > 0 ? nav[idx - 1] : null;
  const next = idx < nav.length - 1 ? nav[idx + 1] : null;

  return (
    <div>
    {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-3xl font-semibold tracking-tight leading-tight">
            Flowtra Help Center
          </h1>
          <p className="mt-4 text-slate-600 text-lg max-w-3xl">
            Everything you need to get started: installation, recording, smart steps (extract, loops, import/export),
            secrets, scheduling, AI-powered reliability, and troubleshooting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-xl bg-indigo-600 px-5 py-3 text-white font-medium hover:bg-indigo-700"
            >
              Get Started
            </Link>
            <button
              onClick={() => setShowPopup(true)}
              className="rounded-xl border border-slate-300 px-5 py-3 text-slate-800 font-medium hover:bg-slate-50"
            >
              Contact us
            </button>
          </div>
        </div>
      </section>

      {/* Body with sticky side index */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-[220px_1fr] gap-8">
        {/* Index (desktop) */}
        <nav className="hidden md:block sticky top-28 self-start">
          <ul className="text-sm text-slate-700 space-y-2">
            {nav.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId(n.id);
                  }}
                  className={`hover:text-slate-900 ${activeId === n.id ? "text-slate-900 font-medium" : ""}`}
                >
                  {n.label}
                </a>
              </li>
            ))}
          </ul>

        </nav>

        {/* Main content */}
        <div className="space-y-12">
          {/* Quick Start */}
          <Section id="quick-start" title="Quick Start">
            <ol className="list-decimal list-inside space-y-3 text-slate-700">
              <li>
                <b>Sign Up / Sign In</b> &mdash; Go to <code>flowtra.app</code>. Create an account with just
                your <b>email and password</b> (no email verification during beta; email must be unique), or sign in.
              </li>
              <li>
                <b>Install the Agent</b> &mdash; If not installed, you’ll see a download prompt. Install once;
                the Agent will try to auto-start each time you log in. When running, you’ll see its status in the dashboard.
              </li>
              <li>
                <b>Record &amp; Refine</b> &mdash; Enter the <b>target URL</b> in the dashboard, click <b>Record</b>.
                A browser opens (sometimes in background). Wait for the page to fully load. Perform your steps naturally
                (click/type/select/navigate). Use <b>Preview</b> during recording to validate progress. Close the
                recording browser to stop.
              </li>
              <li>
                <b>Save &amp; Replay</b> &mdash; Review and delete unnecessary steps (e.g., extra focus/blur) if desired.
                <b> Save</b> the flow (required) and then replay to confirm.
              </li>
              <li>
                <b>Schedule</b> &mdash; After confirming, schedule runs (local Agent must be running at the scheduled time).
              </li>
            </ol>

            <Note>
              If your session expires or you close/switch the dashboard tab before saving, unsaved steps can be lost.
              A guard warns on tab switches, but best practice is to save immediately after recording.
            </Note>
          </Section>

          {/* Installation & Setup */}
          <Section id="install" title="Installation & Setup">
            <div className="space-y-4 text-slate-700">
              <div>
                <b>Download & Install (Windows beta)</b>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>On first sign-in, download the Flowtra Agent and run the installer.</li>
                  <li>
                    If Windows Defender warns (unsigned installer), click <b>More info → Run anyway</b>.
                  </li>
                  <li>
                    If your browser blocks the download, choose <b>Keep/Allow</b>.
                  </li>
                  <li>After installation, the Agent should auto-start; otherwise, launch it from the Start Menu.</li>
                </ul>
              </div>

              <Callout title="If the Agent doesn’t start">
                The most common reason is Defender/antivirus blocking. Unblock in AV settings. Rarely, stale lock files
                on low-resource systems can prevent startup:
                <code className="block mt-2">C:\Users\&lt;user&gt;\AppData\Local\Flowtra\agent.lock</code>
                <code className="block">C:\Users\&lt;user&gt;\AppData\Local\Flowtra\settings.lock</code>
                Delete them if present and start the Agent again. Logs are also in:
                <code className="block mt-1">C:\Users\&lt;user&gt;\AppData\Local\Flowtra</code>
              </Callout>

              <div>
                <b>First Launch</b>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>The dashboard checks Agent status; when active, you’ll see a green indicator.</li>
                  <li>
                    On first launch, the Agent prompts you to <b>verify settings</b> (choose browser, confirm paths).
                  </li>
                </ul>
              </div>

              <div>
                <b>Configuration Tips</b>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Chrome/Edge paths are auto-detected (Chrome selected by default; switch in settings if needed).</li>
                  <li>
                    You can opt into a bundled Chromium; Flowtra downloads it for you (after prompting).
                  </li>
                  <li>
                    Recommended: test the selected browser once from settings to ensure smooth recording.
                  </li>
                  <li>If on a corporate network, allowlist Flowtra domains and the Agent WebSocket port.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Record a Workflow */}
          <Section id="record" title="Record a Workflow">
            <div className="space-y-4 text-slate-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <b>Enter the target URL</b> in the dashboard (e.g., <code>https://portal.example.com/login</code>).
                </li>
                <li>
                  <b>Click Record</b> — a new browser opens (bring to front if it launches in background).
                  Wait until the page is <b>fully loaded</b>, then perform your steps (click/type/select/navigate).
                </li>
                <li>
                  Use <b>Preview</b> anytime during recording to verify the captured part of the flow.
                </li>
                <li>
                  <b>Stop recording</b> by closing the recording browser window. Steps appear in the dashboard.
                </li>
                <li>
                  <b>Refine before saving</b> — delete duplicates/unnecessary steps (like extra focus/blur) if you want.
                  Renaming/reordering isn’t supported yet.
                </li>
                <li>
                  <b>Save before replay</b> — you must save the flow to replay or schedule it.
                </li>
              </ol>

              <SmartSelectorsCallout />

              <Note title="Secure Inputs">
                When you reach sensitive fields (passwords, API keys), the dashboard prompts you to map to a{" "}
                <b>secret</b>. Only the secret’s <i>name</i> is saved with your flow; the actual value stays local in
                your Agent. You can type a new secret name and keep recording, but it must be configured in Agent
                Settings <b>before preview or replay</b>.
              </Note>

              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="font-medium">Working with saved flows</div>
                <p className="text-sm text-slate-600 mt-1">
                  In the <b>Create</b> tab, use the dropdown to load a saved flow’s steps. You can delete steps and{" "}
                  <b>Save as New Flow</b>. Updating an existing flow in place isn’t supported yet.
                </p>
              </div>
            </div>
          </Section>

          {/* Smart Steps */}
          <Section id="smart-steps" title="Smart Steps">
            <div className="space-y-8 text-slate-700">
              {/* Extract */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Extract Steps</h3>
                <div className="mt-2 space-y-4">
                  <div>
                    <div className="font-medium">From Data Grid</div>
                    <p className="mt-1">
                      Prompted to select a grid/table in the recording browser. Flowtra detects columns and types (text,
                      number, date). Choose columns, optionally add filters (e.g., <i>Status = Pending</i>), name the
                      step (e.g., <i>Extract Patients</i>). The dataset can feed loops or exports.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium">Import from CSV/Excel</div>
                    <p className="mt-1">
                      Use a local file as your dataset (<code>.csv</code>, <code>.xlsx</code>).{" "}
                      <b>Specify the full file path</b> on the Agent machine (e.g.,{" "}
                      <code>C:\Data\DailyExports\patients.xlsx</code>). Uploading a sample is only for preview/column
                      naming; at runtime, the player loads from the saved path. If the file isn’t there, the run fails.
                    </p>
                  </div>
                </div>
              </div>

              {/* Loops */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Loop Steps</h3>
                <div className="mt-2 space-y-4">
                  <div>
                    <div className="font-medium">Counter-Based Loop</div>
                    <p className="mt-1">
                      Repeat enclosed steps a fixed number of times (e.g., 5). Useful for testing or when the workflow
                      isn’t tied to data.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium">Data-Driven Loop</div>
                    <p className="mt-1">
                      Iterate over rows from a prior Extract (grid) or an Import (CSV/Excel). Map actions (type/click/
                      select) to the row’s columns. <b>Example:</b> Extract a patient list → loop each row → open the
                      record → update DOB and Status → save → move to next row.
                    </p>
                  </div>
                </div>

                <Note title="Best Practices">
                  Use counter loops for fixed repetition and smoke tests. Prefer data-driven loops when inputs come from
                  grids/CSV. Keep the loop body narrow (only steps that must repeat). Validate your dataset and mappings
                  before running a data-driven loop.
                </Note>
              </div>

              {/* Export Data */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Export Data</h3>
                <p className="mt-1">
                  Save results from an Extract step to a file for reports or downstream tools. Select the extract, pick{" "}
                  <b>CSV</b> or <b>JSON</b>, and enter a <b>file path</b>. By default Flowtra writes under{" "}
                  <code>Documents\Flowtra\exports</code>, but you can change it (e.g.,{" "}
                  <code>C:\Data\Exports\claims_today.csv</code>). Use <i>append timestamp</i> to preserve history, or{" "}
                  <i>overwrite</i> to replace the file each run.
                </p>
                <Note>
                  Always double-check the export path if you don’t see a file. Many misses are just a path mix-up.
                </Note>
              </div>
            </div>
          </Section>

          {/* Smart Selectors & AI Recovery */}
          <Section id="smart-selectors" title="Smart Selectors & AI Recovery">
            <div className="space-y-4 text-slate-700">
              <p>
                Flowtra uses GPT-powered heuristics to keep flows reliable when pages change.
              </p>
              <div>
                <div className="font-medium">What it does today</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    <b>Selector retry on failure</b> — AI-assisted hints (label text, nearby context, role/aria).
                  </li>
                  <li>
                    <b>Heuristic fallbacks</b> — combines text, role, position, and attributes to raise match confidence.
                  </li>
                  <li>
                    <b>Readable diagnostics</b> — logs explain what was tried (e.g., “retried with label ‘Submit’ and role=button”).
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="font-medium">Coming soon</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>One-click improved selector proposals you can accept.</li>
                  <li>Auto-healing fallbacks saved for future runs.</li>
                  <li>Change-aware learning that prefers more stable patterns.</li>
                </ul>
              </div>
              <div>
                <div className="font-medium">Best practices</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Wait for elements to fully load before acting.</li>
                  <li>Prefer clearly labeled controls for stronger matching.</li>
                  <li>Use <b>Preview</b> after edits; inspect retries/fixes when a step fails repeatedly.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Secrets & Sensitive Data */}
          <Section id="secrets" title="Secrets & Sensitive Data">
            <div className="space-y-4 text-slate-700">
              <p>
                Map sensitive inputs (passwords, API keys) to <b>secrets</b> stored locally in your Agent. Secret values
                never leave your machine; only the <i>secret name</i> is saved with your flow.
              </p>

              <ol className="list-decimal list-inside space-y-2">
                <li>
                  <b>Create secrets</b> in Agent Settings (pick a clear name, e.g., <i>portalPassword</i>).
                </li>
                <li>
                  During recording, the dashboard will <b>prompt immediately</b> when it detects a sensitive field. Choose an
                  existing secret or type a new name.
                </li>
                <li>
                  You can continue recording even if the secret doesn’t exist yet. <b>Before preview or replay</b>, add the
                  secret with the same name in Agent Settings (you can open it from the mapping dialog; new secrets show up
                  instantly in the dropdown).
                </li>
                <li>
                  On replay, the Agent fills the real value securely.
                </li>
              </ol>

              <Note title="Best Practices">
                Use descriptive names (<i>billingPortalPassword</i>). Map every sensitive field. When sharing flows,
                teammates must create secrets with the same names in their own Agents.
              </Note>
            </div>
          </Section>

          {/* Schedule & Automation */}
          <Section id="schedule" title="Schedule & Automation">
            <div className="space-y-4 text-slate-700">
              <ul className="list-disc list-inside space-y-1">
                <li>A flow must be <b>saved</b> before it can be scheduled.</li>
                <li>Scheduled runs are executed by the <b>local Agent</b> on your machine.</li>
                <li>
                  Your computer must be <b>on</b> and the Agent must be <b>running</b> at the scheduled time.
                </li>
              </ul>
              <div className="font-medium">Common scenarios</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Nightly checks (reports/status) ready by morning.</li>
                <li>Weekly portal downloads/vendor data pulls.</li>
                <li>CSV-driven processing (row-by-row form submissions).</li>
              </ul>
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-sm">
                  <b>Notifications (coming soon):</b> In-app/email alerts on completion or failure. For now, review run
                  history/logs after the scheduled time.
                </div>
              </div>
              <div className="font-medium">Best practices</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Replay manually once before scheduling.</li>
                <li>Keep flows modular; chain smaller flows for reliability.</li>
                <li>Monitor the first runs and check logs for dynamic portals.</li>
              </ul>
              <Note>Cloud scheduling isn’t available yet; all scheduling depends on the local Agent.</Note>
            </div>
          </Section>

          {/* Troubleshooting */}
          <Section id="troubleshooting" title="Troubleshooting">
            <div className="space-y-6 text-slate-700">
              <div>
                <div className="font-medium">Browser blocks download</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Choose <b>Keep</b> (Chrome) or <b>Allow</b> (Edge). Installer is safe; code signing coming soon.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Installation blocked by Windows Defender/antivirus</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Click <b>More info → Run anyway</b> in Defender.</li>
                  <li>If quarantined, mark safe/restore in antivirus.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Agent does not start</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Launch manually from the Start Menu.</li>
                  <li>Unblock in Defender/AV if it was prevented.</li>
                  <li>
                    Rarely, delete stale lock files then restart Agent:
                    <code className="block mt-1">C:\Users\&lt;user&gt;\AppData\Local\Flowtra\agent.lock</code>
                    <code className="block">C:\Users\&lt;user&gt;\AppData\Local\Flowtra\settings.lock</code>
                    Logs are also here:
                    <code className="block mt-1">C:\Users\&lt;user&gt;\AppData\Local\Flowtra</code>
                  </li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Recording browser doesn’t open in focus</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Bring the window to front; wait for full page load before acting.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Flow doesn’t replay as expected</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Save immediately after recording ends.</li>
                  <li>Configure required <b>secrets</b> before preview/replay.</li>
                  <li>If dashboard tab closed/switched mid-recording, restart and try again.</li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPopup(true)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-white font-medium hover:bg-indigo-700"
                >
                  Contact us
                </button>
                <span className="text-sm text-slate-600">
                  For faster help, attach logs from <code>C:\Users\&lt;user&gt;\AppData\Local\Flowtra</code>.
                </span>
              </div>
            </div>
          </Section>
          {/* Contact popup */}
          <ReachOutPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
        </div>
      </div>

      {/* Floating Back-to-top + Prev/Next */}
      <FloatingPager
        prev={prev}
        next={next}
        onPrev={() => prev && scrollToId(prev.id)}
        onNext={() => next && scrollToId(next.id)}
      />

    </div>
  );
}

/* ---------- helpers (interactive Sections + floating pager) ---------- */

function Section({ id, title, children, nav }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="mt-3">{children}</div>

      {/* Section footer: Back to index + Prev/Next inline */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          className="text-sm text-slate-600 underline"
        >
          Back to index
        </a>
      </div>

      <hr className="mt-6 border-slate-200" />
    </section>
  );
}

function FloatingPager({ prev, next, onPrev, onNext }) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {/* Back to top */}
      <button
        onClick={scrollToTop}
        className="rounded-full shadow-sm border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        title="Back to top"
      >
        ↑ Top
      </button>

      {/* Prev/Next */}
      <div className="flex gap-2">
        {prev && (
          <button
            onClick={onPrev}
            className="rounded-xl shadow-sm border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            title={`Back to: ${prev.label}`}
          >
            ← {truncate(prev.label)}
          </button>
        )}
        {next && (
          <button
            onClick={onNext}
            className="rounded-xl shadow-sm border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            title={`Next: ${next.label}`}
          >
            {truncate(next.label)} →
          </button>
        )}
      </div>
    </div>
  );
}

function Note({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
      <div className="text-sm text-slate-800">
        {title && <b className="block mb-1">{title}</b>}
        {children}
      </div>
    </div>
  );
}

function Callout({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white">
      {title && <div className="font-medium">{title}</div>}
      <div className="text-sm text-slate-600 mt-1">{children}</div>
    </div>
  );
}

function SmartSelectorsCallout() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-800">
        <b>Smart Selectors.</b> If a step can’t find its element, Flowtra uses GPT-assisted retries to match by label,
        role, and context. <span className="text-slate-600">Coming soon:</span> one-click improved selectors that
        auto-heal future runs.
      </div>
    </div>
  );
}

function truncate(s, n = 18) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
