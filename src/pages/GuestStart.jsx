// routes/GuestStart.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";
import { gaEvent } from "../utils/analytics";

export default function GuestStart() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  const { user, login } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/guest/start`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey
            }}
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json(); // { token, expiresAtUtc }
        localStorage.setItem("botflows_token", data.token);
        sessionStorage.setItem("flowtra_banner", "guest"); // show one-time banner
        login(data.token);
        gaEvent("guest_start");
        nav("/dashboard");
      } catch (e) {
        setErr(e.message || "Unable to start guest session");
      }
    })();
  }, [nav]);

  if (err) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <h1 className="text-xl font-semibold">Guest start failed</h1>
        <p className="mt-2 text-slate-600">{err}</p>
      </div>
    );
  }
  return (
    <div className="max-w-lg mx-auto mt-24 text-center">
      <p className="text-slate-600">Starting a guest session…</p>
    </div>
  );
}
