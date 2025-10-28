// components/GuestBanner.jsx
import React, { useEffect, useState } from "react";
import { isGuest } from "../utils/auth";

export default function GuestBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isGuest() && sessionStorage.getItem("flowtra_banner") === "guest") {
      setShow(true);
      // clear flag so it shows once per entry
      setTimeout(() => sessionStorage.removeItem("flowtra_banner"), 0);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-800 flex items-center justify-between">
      <span>You’re in guest mode. Workspaces reset in 24 hours.</span>
      <a href="/signup" className="px-3 py-1 rounded-lg bg-sky-600 text-white">Save my progress</a>
    </div>
  );
}
