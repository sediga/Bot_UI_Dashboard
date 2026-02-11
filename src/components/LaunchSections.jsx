import React, { useState } from "react";
import { Link } from "react-router-dom";
import ReachOutPopup from "./ReachOutPopup";
import { useAuth } from "../contexts/AuthContext";

export default function LaunchSections() {
  const { user } = useAuth();

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupProps, setPopupProps] = useState({});

  const openVideo = (src) => {
    if (!src) return;
    setActiveVideoSrc(src);
    setShowVideoModal(true);
  };

  const closeVideo = () => {
    setShowVideoModal(false);
    setActiveVideoSrc("");
  };

  const openPopup = (props) => {
    setPopupProps(props || {});
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setPopupProps({});
  };

  const handleMediaActivate = (section) => {
    if (section.video) {
      openVideo(section.video);
    } else if (section.link) {
      openPopup(section.popupProps);
    }
  };

  const sections = [
    {
      title: "Ready to automate smarter?",
      content: (
        <>
          See your first real portal flow in action — from NPI lookups to payer, credentialing,
          or device dashboards, Flowtra turns nightly busywork into a button.
          <div className="mt-4">
            <a
              href="https://flowtra.app/signup"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Create a free Flowtra account
            </a>
            <p className="text-sm mt-2 text-gray-600">
              Prefer a guided path?{" "}
              <button
                type="button"
                onClick={() =>
                  openPopup({
                    title: "Request a 20-minute walkthrough",
                    emailLabel: "Your work email",
                    messageLabel: "What workflow do you want to automate?",
                    messagePlaceholder:
                      "Describe the portals you use (payer, NPI, CAQH, devices, transcripts, scheduling, etc.) and what you’d like to automate…",
                    submitText: "Request walkthrough",
                  })
                }
                className="underline cursor-pointer"
              >
                Book a 20-minute call
              </button>
            </p>
          </div>
        </>
      ),
      image: "/assets/slides/action_1.png",
      imageAlt: "Join now CTA banner"
    },
    {
      title: "Simple setup. Production-grade results.",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Install the Flowtra Agent on a Windows desktop or server your team already uses.</li>
          <li>
            Log in to the Flowtra dashboard and record a real workflow —
            NPI lookups, CAQH checks, payer status sweeps, or device/transcript portals.
          </li>
          <li>
            Save the flow, add CSV inputs or loops, and run it on demand or on a schedule.
          </li>
          <li>
            Start with local runs; move to managed or cloud-orchestrated runs when you’re ready.
          </li>
        </ol>
      ),
      image: "/assets/slides/architecture_1.png",
      imageAlt: "Architecture diagram of Flowtra setup",
      video: "/assets/slides/onboard/basic_flow/signup.mp4",
      videoLabel: "Watch setup demo",
    },
    {
      title: "Smarter browser automation for portal work",
      content: (
        <>
          Record clicks, type into fields, step through grids, filter rows, and
          build repeatable flows — without writing code.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Smart selectors with fallback and recovery when portals change.</li>
            <li>
              Loop over table rows (claims, providers, members, transcripts) and perform actions per row.
            </li>
            <li>Inject dynamic logic and variables for payer-specific quirks.</li>
            <li>Debug flows with full visibility into each step and selector.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/web-automation-flowchart.png",
      imageAlt: "Flow diagram of web automation",
      video: "/assets/slides/onboard/basic_flow/intro_final_AI_VO_2.mp4",
      videoLabel: "See NPI export in action",
    },
    {
      title: "Secure and private by design",
      content: (
        <>
          Your flows run through the Flowtra Agent by default, so credentials and sensitive data
          can stay on your side of the fence.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Agent can run on your own desktop or server in your network.</li>
            <li>Encryption in transit and at rest for any data sent to Flowtra services.</li>
            <li>No scripts or data stored without your consent; PHI retention is opt-in and explicit.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/secure.png",
      imageAlt: "Security shield and privacy icons"
    },
    {
      title: "Built for lean healthcare teams, not giant RPA budgets",
      content: (
        <>
          Flowtra is for billing, RCM, credentialing, and healthtech product teams
          that live in external portals but can’t justify heavyweight RPA platforms.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Works with the portals you already use — payer, NPI, CAQH, device and transcript sites.</li>
            <li>Start with one or two critical flows and expand as you see real time savings.</li>
            <li>Ideal for 2–50 person teams or focused product squads that need automation yesterday.</li>
          </ul>

          <div className="mt-4 text-sm text-gray-700">
            Not sure where to start?{" "}
            <button
              type="button"
              onClick={() =>
                openPopup({
                  title: "Talk to us about your workflows",
                  emailLabel: "Your work email",
                  messageLabel: "What portal work do you want off your plate?",
                  messagePlaceholder:
                    "Describe the portals you use (payer, NPI, CAQH, devices, transcripts, etc.) and where your team is losing time…",
                  submitText: "Contact Flowtra",
                })
              }
              className="underline cursor-pointer"
            >
              Contact us
            </button>
          </div>
        </>
      ),
      image: "/assets/slides/onboarding_1.png",
      imageAlt: "Illustration of healthcare teams and product squads",
    },
    {
      title: "Custom bots for your ugliest workflows",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Have a complex workflow Flowtra doesn’t cover out of the box?</li>
          <li>
            We’ll design and build a custom bot around your exact portals, grids, and business rules.
          </li>
          <li>
            From multi-page payer forms to device or transcript dashboards, we handle the edge cases.
          </li>
          <li>
            Submit a request and we’ll respond within one business day with next steps.
          </li>
        </ol>
      ),
      image: "/assets/slides/custom_bot.png",
      imageAlt: "Custom bot development illustration",
      link: true,
      linkCaption: "Tell us what you need",
      popupProps: {
        title: "Request a custom bot",
        emailLabel: "Your work email",
        messageLabel: "Automation requirement",
        messagePlaceholder:
          "Describe your workflow, portals (payer, NPI, CAQH, devices, transcripts, etc.), and what “done” looks like…",
        submitText: "Send request",
      },
    },
    {
      title: "Join early. Get your portal workflows off the team's plate.",
      content: (
        <>
          Flowtra is in active development, and we’re working closely with a small number
          of healthcare teams and healthtech products that depend on external portals.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Bring us one or two high-pain workflows you want off your team’s plate.</li>
            <li>We help you capture, harden, and monitor those flows end-to-end.</li>
            <li>When payer, NPI, CAQH, or vendor portals change, we update the automations.</li>
            <li>Early customers get priority support and locked-in early-access pricing.</li>
          </ul>

          <div className="mt-5">
            <Link
              to="/learn-more"
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              Become a Design Partner
            </Link>
          </div>
        </>
      ),
      image: "/assets/slides/feedback_2.png",
      imageAlt: "Collaborative roadmap illustration",
      video: "/assets/slides/onboard/basic_flow/feedback_1.mp4",
      videoLabel: "See how feedback loops work",
    },
  ];

  return (
    <div style={{ paddingTop: "var(--header-offset)" }}>
      <div className="bg-transparent px-4 sm:px-6 lg:px-16 xl:px-24 py-12 space-y-16">
        {sections.map((section, idx) => {
          const isInteractive = !!(section.video || section.link);
          const overlayLabel =
            section.videoLabel || section.linkCaption || "Learn more";

          return (
            <section
              key={section.title}
              className={`flex flex-col md:flex-row items-center gap-10 ${
                idx % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Media area */}
              <div
                className={`relative md:w-1/2 w-full flex items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${
                  isInteractive ? "group cursor-pointer" : ""
                }`}
                onClick={() => isInteractive && handleMediaActivate(section)}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!isInteractive) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMediaActivate(section);
                  }
                }}
              >
                <img
                  src={section.image}
                  alt={section.imageAlt}
                  className={
                    section.className ||
                    "w-full h-64 object-contain bg-slate-50"
                  }
                />

                {isInteractive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3 text-white text-sm font-medium">
                      {section.video && (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70">
                          {/* simple play icon */}
                          <span className="-ml-0.5 border-l-[10px] border-l-white border-y-[6px] border-y-transparent" />
                        </span>
                      )}
                      <span>{overlayLabel}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Text content */}
              <div className="md:w-1/2 w-full text-gray-800">
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                  {section.title}
                </h2>
                <div className="text-base leading-relaxed">
                  {section.content}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Video modal */}
      {showVideoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={closeVideo}
        >
          <div
            className="bg-white rounded-lg overflow-hidden w-[90%] max-w-6xl relative shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeVideo}
              className="absolute top-2 right-2 text-gray-700 hover:text-black text-2xl font-bold px-3 z-10"
              aria-label="Close video"
            >
              &times;
            </button>
            <video
              controls
              autoPlay
              className="w-full h-auto max-h-[90vh]"
              onEnded={closeVideo}
            >
              <source src={activeVideoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Contact / custom-bot popup (single instance) */}
      <ReachOutPopup
        isOpen={showPopup}
        onClose={closePopup}
        userEmail={user?.email || ""}
        {...popupProps}
      />
    </div>
  );
}
