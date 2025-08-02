import { useState } from "react";
// components/BetaLaunchSections.jsx
export default function BetaLaunchSections() {
  const [showModal, setShowModal] = useState(false);
  const [videoSrc, setVideoSrc] = useState("");
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
      image: "/assets/slides/recording_3.png", 
      imageAlt: "Screenshot of recording flow",
      video: "/assets/slides/onboard/basic_flow/grid_export.mp4",
    },
    {
      title: "Affordable Automation for Startups and Small Teams",
      content: (
        <>
        Built specifically for small-scale companies and startups who can't afford dedicated automation or scraping teams, Flowtra empowers you to automate tasks effortlessly.
        <ul className="list-disc list-inside mt-3 text-sm text-gray-700">
            <li>Affordable automation for startups</li>
            <li>No coding or technical expertise required</li>
            <li>Eliminate manual, repetitive tasks quickly</li>
            <li>Perfect for lean teams needing efficiency</li>
        </ul>
        </>      ),
      image: "/assets/slides/action.png", 
      imageAlt: "Illustration of various user types",
      video: "/assets/slides/onboard/basic_flow/Recording_demo_2.mp4",
    //   className: "w-full h-full object-cover bg-gradient-to-b from-indigo-50 to-white"
    },
    {
      title: "Join Early. Shape the Future.",
      content: (
        <>
          Flowtra is in active development — and your feedback drives our roadmap.
          <ul className="list-disc list-inside mt-3 text-sm text-gray-700">
            <li>Free during beta and beyond (*anything created during beta, stay free)</li>
            <li>Suggest features</li>
            <li>Direct line to the team</li>
            <li>Early access to premium capabilities</li>
          </ul>
        </>
      ),
      image: "/assets/slides/feedback_1.png", 
      imageAlt: "Collaborative roadmap image",
      background:"bg-gradient-to-b from-indigo-50 to-white",
      video: "/assets/slides/onboard/basic_flow/feedback_1.mp4",
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
      image: "/assets/slides/architecture.png",
      imageAlt: "Architecture diagram of Flowtra setup",
      video: "/assets/slides/onboard/basic_flow/agent_install.mp4",
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
    // {
    //   title: "Ready to Automate Smarter?",
    //   content: (
    //     <>
    //       Join the Flowtra Beta today — free and open to early testers.
    //       <div className="mt-4">
    //         <a
    //           href="https://flowtra.app"
    //           className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded font-medium transition"
    //         >
    //           Get Started at flowtra.app
    //         </a>
    //         <p className="text-sm mt-2 text-gray-600">
    //           Need help? <a href="mailto:support@flowtra.app" className="underline">Contact support</a>
    //         </p>
    //       </div>
    //     </>
    //   ),
    //   image: "/assets/slides/action.png", 
    //   imageAlt: "Join now CTA banner",
    // },
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
          {/* Image Placeholder */}
        <div className={`relative md:w-1/2 w-full h-64 flex items-center justify-center rounded-lg overflow-hidden ${
                section.video ? "group cursor-pointer" : ""
            }`}
            onClick={() => {
                if (section.video) {
                    setVideoSrc(section.video);
                    setShowModal(true);
                }
            }}
        >
        <img
            src={section.image}
            alt={section.imageAlt}
            className={section.className?? "w-full h-full object-contain"}
        />
      {section.video && (    
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <span className="text-white text-lg font-medium">▶ {section.videoCaption?? "Watch how"}</span>
        </div>
      )}
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
