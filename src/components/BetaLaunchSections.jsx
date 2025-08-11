import { useState } from "react";
import ReachOutPopup from "./ReachOutPopup";
import { useAuth } from "../contexts/AuthContext";
// components/BetaLaunchSections.jsx
export default function BetaLaunchSections() {
  const [showModal, setShowModal] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupProps, setPopupProps] = useState(null);
  const { user } = useAuth();
  const sections = [
    {
      title: "Smarter Browser Automation, Built for Real Life",
      content: (
        <>
          Record clicks, input text, extract table rows, filter data, and build repeatable flows — all without writing code.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700">
            <li>Smart selectors with fallback and recovery</li>
            <li>Loop over table rows and perform actions</li>
            <li>Inject dynamic logic and variables</li>
            <li>Debug your flows with full visibility</li>
          </ul>
        </>
      ),
      image: "/assets/slides/web-automation-flowchart.svg", 
      imageAlt: "Screenshot of recording flow",
      video: "/assets/slides/onboard/basic_flow/grid_export.mp4",
    },
    {
      title: "Simple Setup. Powerful Results.",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Install Flowtra Agent on your desktop</li>
          <li>Login to Flowtra Dashboard and start recording</li>
          <li>Save, schedule, and replay flows</li>
          <li>Run in the cloud or locally — your choice</li>
        </ol>
      ),
      image: "/assets/slides/architecture_1.png",
      imageAlt: "Architecture diagram of Flowtra setup",
      video: "/assets/slides/onboard/basic_flow/agent_install.mp4",
    },
    {
      title: "Affordable Automation for Startups, Small Teams, and Individuals",
      content: (
        <>
          Flowtra is built for small companies, lean teams, and individuals who can’t afford complex RPA tools or scraping services — now you can automate repetitive tasks effortlessly.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700">
            <li>No coding or technical expertise required</li>
            <li>Eliminate manual, repetitive tasks in minutes</li>
            <li>Automation Made for Small Teams and Individual</li>
          </ul>
        </>
      ),
      image: "/assets/slides/onboarding_1.png",
      imageAlt: "Illustration of various user types",
    },
    {
      title: "Custom Bots. Built Just for You.",
      content: (
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li>Have a complex workflow that Flowtra doesn’t cover?</li>
          <li>We’ll build a custom bot tailored to your exact process</li>
          <li>From multi-page forms to legacy portals — we handle it all</li>
          <li>Submit a request and get started in 24 hours</li>
        </ol>
      ),
      image: "/assets/slides/custom_bot.png", // <- Add this image or placeholder
      imageAlt: "Custom bot development illustration",
      linkCaption: "Tell us what you need",
      link: true,
      popupProps: {
        title: "Request a Custom Bot",
        emailLabel: "Your Work Email",
        messageLabel: "Automation Requirement",
        messagePlaceholder: "Describe your workflow or problem...",
        submitText: "Send Request"
      }
    },
    {
      title: "Join Early. Shape the Future.",
      content: (
        <>
          Flowtra is in active development — and your feedback drives our roadmap.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700 space-y-1">
            <li>Everything you create during beta stays free — no surprises later</li>
            <li>Suggest features and help shape core capabilities</li>
            <li>New smart flows and templates added daily</li>
            <li>We listen — your real-world needs drive what we build next</li>
          </ul>
        </>
      ),
      image: "/assets/slides/feedback_2.png", 
      imageAlt: "Collaborative roadmap image",
      background: "bg-gradient-to-b from-indigo-50 to-white",
      video: "/assets/slides/onboard/basic_flow/feedback_1.mp4",
    },
    {
      title: "Secure and Private by Design",
      content: (
        <>
          Your flows are secure and runs locally unless you choose our cloud option.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700">
            <li>No vendor lock-in</li>
            <li>Local and cloud scheduling options</li>
            <li>No scripts uploaded or data saved without your consent</li>
          </ul>
        </>
      ),
      image: "/assets/slides/secure.png", 
      imageAlt: "Security shield and privacy icons",
      video: "/assets/slides/onboard/basic_flow/config_secure.mp4",
    },
    {
      title: "Ready to Automate Smarter?",
      content: (
        <>
          Start Automating in Minutes — Join the Free Flowtra Beta Now.
          <div className="mt-4">
            <a
              href="https://flowtra.app/signup"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-medium transition"
            >
              Get Started
            </a>
            <p className="text-sm mt-2 text-gray-600">
              Need help? <a onClick={() => setShowPopup(true)} className="underline cursor-pointer">Contact support</a>
            </p>
          </div>
        </>
      ),
      image: "/assets/slides/action_1.png", 
      imageAlt: "Join now CTA banner",
      video: "/assets/slides/onboard/basic_flow/signin_1.mp4",
    },
  ];

  return (
    <div className="bg-transpharent px-24">
      {sections.map((section, idx) => (
        <section
          key={idx}
          className={`flex flex-col md:flex-row ${
            idx % 2 === 1 ? "md:flex-row-reverse" : ""
          } items-center px-6 md:px-16 py-12 gap-10`}
        >
          {/* Image/Video/Link Area */}
          <div
            className={`relative md:w-1/2 w-full h-64 flex items-center justify-center rounded-lg overflow-hidden ${
              section.video || section.link ? "group cursor-pointer" : ""
            }`}
            onClick={() => {
              if (section.video) {
                setVideoSrc(section.video);
                setShowModal(true);
              } else if (section.link) {
                setPopupProps(section.popupProps || {});
                setShowPopup(true);
              }
            }}
          >
            <img
              src={section.image}
              alt={section.imageAlt}
              className={section.className ?? "w-full h-full object-contain"}
            />
            {(section.video || section.link) && (
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <span className="text-white text-lg font-medium">
                  {section.video && "▶" }{(section.videoCaption || section.linkCaption) ?? "Watch"}
                </span>
              </div>
            )}
        <ReachOutPopup
          isOpen={showPopup}
          onClose={(e) => {setShowPopup(false); e.stopPropagation()}}
          userEmail={user?.email || ""}
          {...popupProps}
        />
          </div>
          {/* Text Content */}
          <div className="md:w-1/2 w-full text-gray-800">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">{section.title}</h2>
            <div className="text-base leading-relaxed">{section.content}</div>
          </div>
        </section>
      ))}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg overflow-hidden w-[90%] max-w-6xl relative shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-700 hover:text-black text-2xl font-bold px-3 z-10"
            >
              &times;
            </button>
            <video
              controls
              autoPlay
              className="w-full h-auto max-h-[90vh]"
              onEnded={() => setShowModal(false)}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}


    </div>
  );
}
