import config from "../config";
// agentUpdateClient.js
const withTimeout = (ms) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cleanup: () => clearTimeout(id) };
};

const safeFetch = async (url, init = {}) => {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e && e.name === 'AbortError') return undefined; // <- swallow aborts
    throw e;
  }
};

export async function getUpdateStatus(baseUrl) {
  const { signal, cleanup } = withTimeout(2000);
  try {
    const r = await safeFetch(`${baseUrl}/api/update/status`, { signal });
    if (!r) return null;          // abort/timeout -> null (not throw)
    if (!r.ok) return null;       // treat non-200 as “no result”
    return await r.json();
  } finally {
    cleanup();
  }
}

export async function applyUpdate(baseUrl) {
  // The agent will likely exit immediately after this call
  const { signal, cleanup } = withTimeout(2000);
  try {
    await safeFetch(`${baseUrl}/api/update/apply`, { method: 'POST', signal });
    // Return immediately; if the process exits before we get 200 it's fine.
    return true;
  } finally {
    cleanup();
  }
}

export async function pingStatus(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/status`, { method: 'GET' });
    if (!res || !res.ok) return null;
    return await res.json(); // expect { version: "x.y.z", ... }
  } finally {
  }
}
