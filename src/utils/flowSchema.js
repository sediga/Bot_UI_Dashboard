const CONTAINER_TYPES = new Set(["navigate", "loop", "counterloop", "dataLoop", "switchCase"]);
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
  "switchCase",
  "emailCreateDraft",
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

export function detectDocumentKind(rawDocument) {
  if (Array.isArray(rawDocument)) return "flow";
  if (!rawDocument || typeof rawDocument !== "object") return "unknown";
  if (rawDocument.type === "workflow" && Array.isArray(rawDocument.nodes)) return "workflow";
  if (Array.isArray(rawDocument.steps)) return "flow";
  return "unknown";
}

export function isWorkflowDocument(rawDocument) {
  return detectDocumentKind(rawDocument) === "workflow";
}

export function documentKindLabel(value) {
  const kind = value === "flow" || value === "workflow" ? value : detectDocumentKind(value);
  if (kind === "workflow") return "Workflow";
  if (kind === "flow") return "Flow";
  return "Document";
}

export function extractFlowSteps(rawDocument) {
  if (Array.isArray(rawDocument)) return rawDocument;
  if (rawDocument && typeof rawDocument === "object" && Array.isArray(rawDocument.steps)) {
    return rawDocument.steps;
  }
  return [];
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

function hasTemplateToken(v) {
  return /{{\s*[^}]+\s*}}/.test(String(v || ""));
}

export function validateStep(step, ctx) {
  const errors = [];
  const type = String(step.type || "");

  if (!step.id) errors.push("Missing step id.");

  if (type === "navigate") {
    const url = String(step.url || "");
    if (!url || (!isValidUrl(url) && !hasTemplateToken(url))) {
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

  if (type === "switchCase") {
    const cases = asArray(step.cases);
    if (!cases.length) {
      errors.push("Switch Case requires at least one case.");
    } else if (!cases.some((c) => String(c?.urlContains || "").trim() || c?.isDefault)) {
      errors.push("Switch Case needs a URL match or a default case.");
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

  if (type === "emailCreateDraft") {
    if (!String(step.bodyText || step.body || step.text || "").trim()) {
      errors.push("Email Draft requires body text.");
    }
    if (String(step.attachmentFolderPath || "").trim() && !String(step.subjectIdPattern || "").trim()) {
      errors.push("Email Draft attachment matching requires subjectIdPattern.");
    }
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

export function validateWorkflowDocument(rawDocument) {
  const issues = [];
  if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
    issues.push("Workflow must be a JSON object.");
    return issues;
  }

  const nodes = rawDocument.nodes;
  if (!Array.isArray(nodes) || !nodes.length) {
    issues.push("Workflow must contain a non-empty 'nodes' array.");
    return issues;
  }

  const startNodeId = String(rawDocument.startNodeId || "").trim();
  if (!startNodeId) {
    issues.push("Workflow is missing 'startNodeId'.");
  }

  const seenIds = new Set();
  const nodeIds = new Set();

  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      issues.push(`Node ${index + 1} must be an object.`);
      return;
    }

    const nodeId = String(node.id || "").trim();
    if (!nodeId) {
      issues.push(`Node ${index + 1} is missing 'id'.`);
    } else {
      if (seenIds.has(nodeId)) issues.push(`Duplicate workflow node id '${nodeId}'.`);
      seenIds.add(nodeId);
      nodeIds.add(nodeId);
    }

    if (!String(node.type || "").trim()) {
      issues.push(`Node ${nodeId || index + 1} is missing 'type'.`);
    }
  });

  if (startNodeId && !nodeIds.has(startNodeId)) {
    issues.push(`Workflow startNodeId '${startNodeId}' does not reference a valid node.`);
  }

  nodes.forEach((node, index) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;

    const nodeId = String(node.id || index + 1);
    const nodeType = String(node.type || "").toLowerCase();
    if (nodeType === "switchvalue") {
      const cases = asArray(node.switch?.cases);
      if (!cases.length) {
        issues.push(`Workflow node '${nodeId}' must define switch.cases.`);
      }
      cases.forEach((item, caseIndex) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return;
        const targetId = String(item.targetId || "").trim();
        if (targetId && !nodeIds.has(targetId)) {
          issues.push(`Workflow node '${nodeId}' switch case ${caseIndex + 1} points to missing node '${targetId}'.`);
        }
      });
      return;
    }

    asArray(node.routes).forEach((route, routeIndex) => {
      if (!route || typeof route !== "object" || Array.isArray(route)) return;
      const targetId = String(route.targetId || "").trim();
      if (targetId && !nodeIds.has(targetId)) {
        issues.push(`Workflow node '${nodeId}' route ${routeIndex + 1} points to missing node '${targetId}'.`);
      }
    });
  });

  return issues;
}

export function createEmptyWorkflowDocument() {
  return {
    id: `wf_${Date.now()}`,
    type: "workflow",
    name: "New Workflow",
    version: 1,
    enabled: true,
    startNodeId: "node_start",
    context: {},
    nodes: [
      {
        id: "node_start",
        type: "end",
        name: "Start / End",
        result: {
          status: "completed",
          reason: "Workflow initialized.",
        },
      },
    ],
  };
}

export function validateReplayDocument(rawDocument) {
  const kind = detectDocumentKind(rawDocument);

  if (kind === "workflow") {
    const issues = validateWorkflowDocument(rawDocument);
    asArray(rawDocument?.nodes).forEach((node, index) => {
      if (!node || typeof node !== "object" || Array.isArray(node)) return;
      const nodeType = String(node.type || "").toLowerCase();
      if (nodeType !== "runflow") return;
      if (node.resolvedFlow == null) {
        const nodeId = String(node.id || index + 1);
        issues.push(
          `Workflow node '${nodeId}' is missing resolvedFlow. Load a saved workflow from Replay so the API can materialize it first.`
        );
      }
    });
    return {
      kind,
      hasErrors: issues.length > 0,
      issues,
      document: rawDocument,
    };
  }

  if (kind === "flow") {
    const sourceSteps = extractFlowSteps(rawDocument);
    const validated = validateFlowSteps(sourceSteps);
    const issues = [];

    validated.steps.forEach((step, index) => {
      asArray(step.validationErrors).forEach((message) => {
        issues.push(`Step ${index + 1}: ${message}`);
      });
    });

    const document = Array.isArray(rawDocument)
      ? validated.steps
      : { ...rawDocument, steps: validated.steps };

    return {
      kind,
      hasErrors: validated.hasErrors,
      issues,
      document,
      steps: validated.steps,
    };
  }

  return {
    kind: "unknown",
    hasErrors: true,
    issues: ["Unsupported document shape. Expected a flow or workflow JSON document."],
    document: rawDocument,
  };
}

export function toFlowPayload(steps) {
  const { steps: validated } = validateFlowSteps(steps);
  return validated.map((s) => {
    const { validationErrors, ...rest } = s;
    return rest;
  });
}
