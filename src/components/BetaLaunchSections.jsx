import React, { useState } from "react";
import ReachOutPopup from "./ReachOutPopup";
import { useAuth } from "../contexts/AuthContext";

export default function BetaLaunchSections() {
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
      title: "Simple Setup. Powerful Results.",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Install Flowtra Agent on your desktop.</li>
          <li>Log in to the Flowtra Dashboard and start recording.</li>
          <li>Save, schedule, and replay flows.</li>
          <li>Run locally or in the cloud — your choice.</li>
        </ol>
      ),
      image: "/assets/slides/architecture_1.png",
      imageAlt: "Architecture diagram of Flowtra setup",
      video: "/assets/slides/onboard/basic_flow/flowtra_agent_setup.mp4",
      videoLabel: "Watch setup demo",
    },
    {
      title: "Smarter Browser Automation, Built for Real Life",
      content: (
        <>
          Record clicks, type into fields, extract grid rows, filter data, and
          build repeatable flows — all without writing code.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Smart selectors with fallback and recovery.</li>
            <li>Loop over table rows and perform actions per row.</li>
            <li>Inject dynamic logic and variables.</li>
            <li>Debug your flows with full visibility.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/web-automation-flowchart.png",
      imageAlt: "Flow diagram of web automation",
      video: "/assets/slides/onboard/basic_flow/NPI export_with_cc.mp4",
      videoLabel: "See NPI export in action",
    },
    {
      title: "Custom Bots. Built Just for You.",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Have a complex workflow Flowtra doesn’t cover yet?</li>
          <li>We’ll build a custom bot tailored to your exact process.</li>
          <li>From multi-page forms to legacy portals — we handle it.</li>
          <li>Submit a request and get a response within 24 hours.</li>
        </ol>
      ),
      image: "/assets/slides/custom_bot.png",
      imageAlt: "Custom bot development illustration",
      link: true,
      linkCaption: "Tell us what you need",
      popupProps: {
        title: "Request a Custom Bot",
        emailLabel: "Your work email",
        messageLabel: "Automation requirement",
        messagePlaceholder: "Describe your workflow, portals, and success criteria…",
        submitText: "Send request",
      },
    },
    {
      title: "Affordable Automation for Startups, Small Teams, and Individuals",
      content: (
        <>
          Flowtra is built for small companies, lean teams, and solo operators
          who can’t justify heavyweight RPA tools — but still need real
          automation.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>No coding or technical expertise required.</li>
            <li>Eliminate manual, repetitive tasks in minutes.</li>
            <li>Automation made for small teams and individuals.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/onboarding_1.png",
      imageAlt: "Illustration of various user types",
    },
    {
      title: "Join Early. Shape the Future.",
      content: (
        <>
          Flowtra is in active development — and your feedback drives our roadmap.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Everything you build during beta stays free — no surprises.</li>
            <li>Suggest features and help shape core capabilities.</li>
            <li>New smart flows and templates added regularly.</li>
            <li>Your real-world needs drive what we build next.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/feedback_2.png",
      imageAlt: "Collaborative roadmap illustration",
      video: "/assets/slides/onboard/basic_flow/feedback_1.mp4",
      videoLabel: "See how feedback loops work",
    },
    {
      title: "Secure and Private by Design",
      content: (
        <>
          Your flows run locally by default unless you choose our cloud option.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>No vendor lock-in.</li>
            <li>Local and cloud scheduling options.</li>
            <li>No scripts or data stored without your consent.</li>
          </ul>
        </>
      ),
      image: "/assets/slides/secure.png",
      imageAlt: "Security shield and privacy icons",
      video: "/assets/slides/onboard/basic_flow/local_run.mp4",
      videoLabel: "Watch how local runs work",
    },
    {
      title: "Ready to Automate Smarter?",
      content: (
        <>
          Start automating in minutes — join the Flowtra beta now.
          <div className="mt-4">
            <a
              href="https://flowtra.app/signup"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              Get started
            </a>
            <p className="text-sm mt-2 text-gray-600">
              Need help?{" "}
              <button
                type="button"
                onClick={() => openPopup({})}
                className="underline cursor-pointer"
              >
                Contact support
              </button>
            </p>
          </div>
        </>
      ),
      image: "/assets/slides/action_1.png",
      imageAlt: "Join now CTA banner",
      video: "/assets/slides/onboard/basic_flow/signin_1.mp4",
      videoLabel: "See the first-run experience",
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
                  className={section.className || "w-full h-64 object-contain bg-slate-50"}
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
