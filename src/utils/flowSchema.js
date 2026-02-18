const CONTAINER_TYPES = new Set(["navigate", "loop", "counterloop", "dataLoop"]);
const SMART_TYPES = new Set([
  "gridExtract",
  "importData",
  "apiExtract",
  "exportData",
  "keyValueExtract",
  "keyValueCollect",
  "dataLoop",
  "counterloop",
  "navigate",
]);

function makeStepId(index) {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `step_${Date.now()}_${index}`;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeSelectorList(step) {
  const out = [];
  const primary = typeof step.selector === "string" ? step.selector.trim() : "";
  if (primary) {
    out.push({ selector: primary, source: "primary", score: 0 });
  }
  for (const c of asArray(step.selectors)) {
    if (!c) continue;
    if (typeof c === "string") {
      const s = c.trim();
      if (s) out.push({ selector: s, source: "candidate", score: 0 });
      continue;
    }
    const s = String(c.selector || "").trim();
    if (!s) continue;
    out.push({
      selector: s,
      source: c.source || "candidate",
      score: Number.isFinite(Number(c.score)) ? Number(c.score) : 0,
    });
  }

  const map = new Map();
  for (const c of out) {
    const prev = map.get(c.selector);
    if (!prev || c.score > prev.score) map.set(c.selector, c);
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function normalizeStep(raw, index = 0) {
  const step = raw && typeof raw === "object" ? { ...raw } : {};
  const id = step.id || makeStepId(index);
  const type = String(step.type || "uiAction").trim();

  const normalized = {
    ...step,
    id,
    type,
    label: String(step.label || "").trim(),
    parentId: step.parentId ?? null,
    selectors: normalizeSelectorList(step),
    validationErrors: asArray(step.validationErrors).filter(Boolean),
  };

  if (!normalized.selector && normalized.selectors.length) {
    normalized.selector = normalized.selectors[0].selector;
  }

  if (CONTAINER_TYPES.has(type) && !normalized.name) {
    normalized.name = `${type}-${id.slice(0, 8)}`;
  }

  if (SMART_TYPES.has(type) && !normalized.stepVersion) {
    normalized.stepVersion = 1;
  }

  return normalized;
}

export function normalizeFlowSteps(steps) {
  return asArray(steps).map((s, i) => normalizeStep(s, i));
}

function isValidUrl(v) {
  try {
    const u = new URL(v);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}

export function validateStep(step, ctx) {
  const errors = [];
  const type = String(step.type || "");

  if (!step.id) errors.push("Missing step id.");

  if (type === "navigate") {
    if (!step.url || !isValidUrl(String(step.url))) {
      errors.push("Navigate step requires a valid URL.");
    }
  }

  if (type === "uiAction") {
    if (!String(step.action || "").trim()) errors.push("UI Action step requires action.");
    if (!String(step.selector || "").trim() && !asArray(step.selectors).length) {
      errors.push("UI Action step requires selector or selectors.");
    }
  }

  if (type === "dataLoop") {
    const src = typeof step.source === "string" ? step.source : step.source?.stepId;
    if (!src) {
      errors.push("Data Loop requires source step id.");
    } else if (ctx?.idSet && !ctx.idSet.has(src)) {
      errors.push(`Data Loop source step does not exist: ${src}`);
    }
  }

  if (type === "exportData") {
    if (!step.source) errors.push("Export Data requires source dataset/step id.");
    if (!step.filename) errors.push("Export Data requires filename.");
  }

  if (type === "apiExtract") {
    if (!step.request?.url) errors.push("API Extract requires request.url.");
    if (!asArray(step.columnMappings).length) errors.push("API Extract should include column mappings.");
  }

  return errors;
}

export function validateFlowSteps(rawSteps) {
  const steps = normalizeFlowSteps(rawSteps);
  const idSet = new Set(steps.map((s) => s.id));
  let hasErrors = false;

  const validated = steps.map((s) => {
    const validationErrors = validateStep(s, { idSet });
    if (validationErrors.length) hasErrors = true;
    return {
      ...s,
      validationErrors,
      validationStatus: validationErrors.length ? "failed" : s.validationStatus,
      validationReason: validationErrors.length ? validationErrors[0] : s.validationReason,
    };
  });

  return { steps: validated, hasErrors };
}

export function toFlowPayload(steps) {
  const { steps: validated } = validateFlowSteps(steps);
  return validated.map((s) => {
    const { validationErrors, ...rest } = s;
    return rest;
  });
}
