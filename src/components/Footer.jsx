import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ReachOutPopup from "./ReachOutPopup";
import { useAuth } from "../contexts/AuthContext";

function Footer() {
  const [showPopup, setShowPopup] = useState(false);
  const { user } = useAuth();
  const ref = useRef(null);

  // Measure footer height and expose as CSS var
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty(
        "--footer-offset",
        `${el.offsetHeight}px`
      );
    setVar();
    window.addEventListener("resize", setVar);
    return () => window.removeEventListener("resize", setVar);
  }, []);

  return (
    <footer
      ref={ref}
      className="bg-white/85 backdrop-blur border-t-4"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 text-gray-500 text-sm">
        <div className="text-center">
          © {new Date().getFullYear()}{" "}
          <a
            href="https://edigatech.com"
            className="underline hover:text-gray-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ediga Technology Solutions LLC
          </a>. All rights reserved. <span className="italic">Flowtra™</span> is a product of EdigaTech.
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="https://www.linkedin.com/company/flowtra/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Flowtra on LinkedIn"
            className="inline-flex items-center gap-2 hover:text-gray-700"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
              <path d="M19 0H5C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM7 20H4V9h3v11zM5.5 7.7A2.2 2.2 0 1 1 5.5 3.3a2.2 2.2 0 0 1 0 4.4zM21 20h-3v-5.6c0-1.3-.5-2.1-1.7-2.1-.9 0-1.4.6-1.6 1.2-.1.2-.1.5-.1.8V20h-3V9h3v1.6c.5-.8 1.4-1.9 3.2-1.9 2.1 0 3.6 1.4 3.6 4.3V20z" />
            </svg>
            <span>LinkedIn</span>
          </a>

          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="hover:underline">Terms of Use</Link>
          <button onClick={() => setShowPopup(true)} className="hover:underline cursor-pointer">
            Contact
          </button>
        </div>

        <ReachOutPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      </div>
    </footer>
  );
}

export default Footer;
