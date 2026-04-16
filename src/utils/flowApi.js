import config from "../config";
import { normalizeFlowSteps, toFlowPayload } from "./flowSchema";

function normalizeDocumentType(value) {
  return String(value || "").toLowerCase() === "workflow" ? "workflow" : "flow";
}

function normalizeFlowMeta(item) {
  return {
    ...item,
    type: normalizeDocumentType(item?.type),
  };
}

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
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeFlowMeta) : [];
}

export async function loadFlow(path) {
  const data = await loadDocument(path);
  return normalizeFlowSteps(data);
}

export async function loadDocument(path, { materialize = false } = {}) {
  const params = new URLSearchParams({ path });
  if (materialize) params.set("materialize", "true");

  const res = await fetch(`${config.apiBaseUrl}/api/flows/load?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load flow: HTTP ${res.status}`);
  return res.json();
}

export async function saveDocument(filename, document) {
  const res = await fetch(`${config.apiBaseUrl}/api/flows/save`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ filename, document }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Save failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function saveFlow(filename, steps) {
  return saveDocument(filename, toFlowPayload(steps));
}

export async function getFlowExecutionStatus(path) {
  const res = await fetch(
    `${config.apiBaseUrl}/api/flows/execution-status?path=${encodeURIComponent(path)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch execution status: HTTP ${res.status}`);
  }
  return res.json();
}

export async function syncFlowIdMetadata(path, flowId) {
  const res = await fetch(`${config.apiBaseUrl}/api/flows/sync-flow-id`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ path, flowId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to sync flow ID metadata: HTTP ${res.status}`);
  }
  return res.json();
}
