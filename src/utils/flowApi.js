import config from "../config";
import { normalizeFlowSteps, toFlowPayload } from "./flowSchema";

export function getToken() {
  return localStorage.getItem("botflows_token") || "";
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return {
    Authorization: token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "",
    "Content-Type": "application/json",
    "x-api-key": String(config.apiKey || ""),
    ...extra,
  };
}

export async function listFlows() {
  const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch flows: HTTP ${res.status}`);
  return res.json();
}

export async function loadFlow(path) {
  const res = await fetch(`${config.apiBaseUrl}/api/flows/load?path=${encodeURIComponent(path)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load flow: HTTP ${res.status}`);
  const data = await res.json();
  return normalizeFlowSteps(data);
}

export async function saveFlow(filename, steps) {
  const res = await fetch(`${config.apiBaseUrl}/api/flows/save`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ filename, steps: toFlowPayload(steps) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Save failed: HTTP ${res.status}`);
  }
  return res.json();
}
