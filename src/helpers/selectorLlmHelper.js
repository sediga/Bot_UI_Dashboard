// helpers/selectorLlmHelper.js

import config from "../config";

// Build a tiny client with queueing, dedupe, and payload shaping.
export function makeSelectorLlmHelper({
  baseUrl,                       // e.g. config.apiBaseUrl (or agentServerUrl)
  endpoint = "/api/selector/suggest",
  authType = "api_key",              // "jwt" | "api_key"
  getToken = () => null,         // () => token string
  concurrency = 2,
  onResult = () => {}            // (step, serverJson) => void
} = {}) {
  const queue = [];
  let active = 0;
  const seen = new Map();        // de-dupe by element key

  function headers() {
    const token = (typeof getToken === "function") ? getToken() : getToken;
    const h = { "Content-Type": "application/json" };
    if (authType === "jwt" && token) h.Authorization = `Bearer ${token}`;
    else if (authType === "api_key" && config.apiKey) h["x-api-key"] = config.apiKey;
    return h;
  }

  function elementKey(step) {
    const a = step.attributes || {};
    const text = (step.innerText || step.elementText || "").slice(0, 80);
    return [
      step.url || "",
      (step.tagName || "").toLowerCase(),
      a.id || "", a.name || "", a.type || "",
      step.containerSelector || "",
      step.frameUrl || "",
      text
    ].join("||");
  }

  function buildCandidates(step) {
    const out = [];
    const add = (selector, source, score) => {
      if (!selector) return;
      if (!out.find(c => c.selector === selector)) out.push({ selector, source, score });
    };
    const list = Array.isArray(step.selectors) ? step.selectors : [];
    list.forEach(c => {
      if (!c) return;
      if (typeof c === "string") add(c, "candidate");
      else if (c.selector) add(c.selector, c.source, c.score);
    });
    add(step.selector, "primary");
    add(step.improvedSelector, "improved");
    add(step.devToolsSelector, "devtools");
    return out;
  }

  function buildPayload(step) {
    return {
      url: step.url ?? null,
      frameUrl: step.frameUrl ?? null,
      containerSelector: step.containerSelector ?? null,
      bBox: step.boundingBox ?? undefined,
      pageContext: step.pageContext ?? undefined,        // NEW meta
      sectionHeading: step.sectionHeading ?? undefined,  // NEW meta
      element: {
        tagName: (step.tagName || "").toLowerCase() || null,
        attributes: step.attributes ?? {},
        classList: step.classList ?? [],
        text: step.innerText ?? step.elementText ?? null,
        role: step.role ?? null,
        labelText: step.labelText ?? null,               // NEW meta
        anchorText: step.anchorText ?? null,             // NEW meta
        accessibleName: step.accessibleName ?? null,
        domPath: step.domPath ?? null,                   // NEW meta
        frameContext: step.frameContext ?? null
      },
      candidates: buildCandidates(step)
    };
  }

  async function call(step) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(buildPayload(step))
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM suggest ${res.status}: ${text}`);
    }
    return res.json();
  }

  function pump() {
    if (active >= concurrency) return;
    const step = queue.shift();
    if (!step) return;

    active++;
    call(step)
      .then(data => onResult(step, data))
      .catch(err => console.warn("LLM selector suggest failed:", err))
      .finally(() => {
        active--;
        if (queue.length) pump();
      });
  }

  function enqueue(step) {
    const act = String(step.action || "").toLowerCase();
    // Only call LLM on committed actions (avoid raw "type" spam)
    if (!["click", "change", "select"].includes(act)) return;

    const key = elementKey(step);
    if (seen.has(key)) return;
    seen.set(key, true);

    queue.push(step);
    pump();
  }

  return { enqueue, pump, _seen: seen };
}
