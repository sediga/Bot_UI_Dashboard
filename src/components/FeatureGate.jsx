// components/FeatureGate.jsx
import React from "react";
import { isGuest } from "../utils/auth";

export default function FeatureGate({ feature, children, fallback = null }) {
  const guest = isGuest();

  if (guest && (feature === "schedule" || feature === "secrets" || feature === "export")) {
    return fallback;
  }
  return children;
}
