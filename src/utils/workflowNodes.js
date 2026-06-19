const WORKFLOW_NODE_META = {
  runFlow: {
    title: "Run Flow",
    description: "Call a saved flow and continue on completion or failure.",
    tone: "bg-blue-50 border-blue-200 text-blue-700",
  },
  switchValue: {
    title: "Switch Value",
    description: "Choose the next node by matching a value from workflow context.",
    tone: "bg-violet-50 border-violet-200 text-violet-700",
  },
  delay: {
    title: "Delay",
    description: "Pause for a fixed duration before routing onward.",
    tone: "bg-amber-50 border-amber-200 text-amber-700",
  },
  waitForEvent: {
    title: "Wait For Event",
    description: "Pause until an external event matches one of the configured triggers.",
    tone: "bg-cyan-50 border-cyan-200 text-cyan-700",
  },
  humanReview: {
    title: "Human Review",
    description: "Queue a review task and continue once it is approved or rejected.",
    tone: "bg-rose-50 border-rose-200 text-rose-700",
  },
  end: {
    title: "End",
    description: "Finish the workflow and return a result payload.",
    tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
};

function createNodeId(prefix = "node") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeRoute(route, index = 0) {
  return {
    outcome: String(route?.outcome || `route_${index + 1}`).trim(),
    targetId: String(route?.targetId || "").trim(),
    when: route?.when && typeof route.when === "object" && !Array.isArray(route.when) ? route.when : undefined,
  };
}

function normalizeSwitchCase(item, index = 0) {
  return {
    id: String(item?.id || `case_${index + 1}`).trim(),
    equals: item?.equals ?? "",
    isDefault: Boolean(item?.isDefault),
    targetId: String(item?.targetId || "").trim(),
  };
}

export function workflowNodeTypes() {
  return Object.keys(WORKFLOW_NODE_META);
}

export function workflowNodeMeta(type) {
  return WORKFLOW_NODE_META[String(type || "")] || {
    title: String(type || "Node"),
    description: "Workflow node",
    tone: "bg-gray-50 border-gray-200 text-gray-700",
  };
}

export function createWorkflowNode(type) {
  const nodeId = createNodeId("node");
  switch (String(type || "")) {
    case "runFlow":
      return {
        id: nodeId,
        type: "runFlow",
        name: "Run Flow",
        enabled: true,
        flowRef: { flowId: "", flowHash: "" },
        input: {},
        routes: [
          { outcome: "completed", targetId: "" },
          { outcome: "failed", targetId: "" },
        ],
      };
    case "switchValue":
      return {
        id: nodeId,
        type: "switchValue",
        name: "Switch Value",
        enabled: true,
        switch: {
          source: "{{context.value}}",
          cases: [{ id: "default_case", isDefault: true, targetId: "" }],
        },
      };
    case "delay":
      return {
        id: nodeId,
        type: "delay",
        name: "Delay",
        enabled: true,
        delay: { seconds: 5 },
        routes: [{ outcome: "elapsed", targetId: "" }],
      };
    case "waitForEvent":
      return {
        id: nodeId,
        type: "waitForEvent",
        name: "Wait For Event",
        enabled: true,
        waitForAny: [{ eventType: "email_received", match: {}, outcome: "email_received" }],
        routes: [{ outcome: "email_received", targetId: "" }],
      };
    case "humanReview":
      return {
        id: nodeId,
        type: "humanReview",
        name: "Human Review",
        enabled: true,
        review: { queue: "default", title: "Review required", instructions: "" },
        routes: [
          { outcome: "approved", targetId: "" },
          { outcome: "rejected", targetId: "" },
        ],
      };
    case "end":
    default:
      return {
        id: nodeId,
        type: "end",
        name: "End",
        enabled: true,
        result: { status: "completed", reason: "" },
      };
  }
}

export function normalizeWorkflowNode(node, index = 0) {
  const type = String(node?.type || "end");
  const base = createWorkflowNode(type);
  const normalized = {
    ...base,
    ...(node && typeof node === "object" ? node : {}),
    id: String(node?.id || base.id || `node_${index + 1}`).trim(),
    type,
    name: String(node?.name || base.name || workflowNodeMeta(type).title).trim() || workflowNodeMeta(type).title,
    enabled: node?.enabled !== false,
  };

  if (type === "runFlow") {
    normalized.flowRef = {
      flowId: String(node?.flowRef?.flowId || "").trim(),
      flowHash: String(node?.flowRef?.flowHash || "").trim(),
    };
    normalized.input = node?.input && typeof node.input === "object" && !Array.isArray(node.input) ? node.input : {};
    normalized.routes = (Array.isArray(node?.routes) ? node.routes : base.routes).map(normalizeRoute);
  }

  if (type === "switchValue") {
    normalized.switch = {
      source: String(node?.switch?.source || base.switch.source || "").trim(),
      cases: (Array.isArray(node?.switch?.cases) ? node.switch.cases : base.switch.cases).map(normalizeSwitchCase),
    };
  }

  if (type === "delay") {
    normalized.delay = {
      seconds: node?.delay?.seconds,
      minutes: node?.delay?.minutes,
      hours: node?.delay?.hours,
      days: node?.delay?.days,
    };
    normalized.routes = (Array.isArray(node?.routes) ? node.routes : base.routes).map(normalizeRoute);
  }

  if (type === "waitForEvent") {
    normalized.waitForAny = Array.isArray(node?.waitForAny) ? node.waitForAny : base.waitForAny;
    normalized.routes = (Array.isArray(node?.routes) ? node.routes : base.routes).map(normalizeRoute);
  }

  if (type === "humanReview") {
    normalized.review = {
      queue: String(node?.review?.queue || base.review.queue || "").trim(),
      title: String(node?.review?.title || base.review.title || "").trim(),
      instructions: String(node?.review?.instructions || base.review.instructions || ""),
    };
    normalized.routes = (Array.isArray(node?.routes) ? node.routes : base.routes).map(normalizeRoute);
  }

  if (type === "end") {
    normalized.result = {
      status: String(node?.result?.status || base.result.status || "completed").trim(),
      reason: String(node?.result?.reason || base.result.reason || ""),
    };
  }

  return normalized;
}

export function summarizeWorkflowNode(node) {
  const normalized = normalizeWorkflowNode(node);
  const type = normalized.type;

  if (type === "runFlow") {
    return normalized.flowRef?.flowId
      ? `Calls flow ${normalized.flowRef.flowId}`
      : "Calls a saved flow";
  }

  if (type === "switchValue") {
    const caseCount = Array.isArray(normalized.switch?.cases) ? normalized.switch.cases.length : 0;
    return `${caseCount} case${caseCount === 1 ? "" : "s"} on ${normalized.switch?.source || "workflow value"}`;
  }

  if (type === "delay") {
    const delay = normalized.delay || {};
    const parts = [
      delay.days ? `${delay.days}d` : "",
      delay.hours ? `${delay.hours}h` : "",
      delay.minutes ? `${delay.minutes}m` : "",
      delay.seconds ? `${delay.seconds}s` : "",
    ].filter(Boolean);
    return parts.length ? `Wait ${parts.join(" ")}` : "Wait before continuing";
  }

  if (type === "waitForEvent") {
    const events = Array.isArray(normalized.waitForAny) ? normalized.waitForAny : [];
    return events.length ? `${events.length} event trigger${events.length === 1 ? "" : "s"}` : "Wait for external event";
  }

  if (type === "humanReview") {
    return normalized.review?.queue ? `Queue ${normalized.review.queue}` : "Human review gate";
  }

  if (type === "end") {
    return normalized.result?.status ? `Returns ${normalized.result.status}` : "End workflow";
  }

  return workflowNodeMeta(type).description;
}

export function workflowNodeConnections(node) {
  const normalized = normalizeWorkflowNode(node);

  if (normalized.type === "switchValue") {
    return (normalized.switch?.cases || []).map((item, index) => ({
      key: item.id || `case_${index + 1}`,
      label: item.isDefault ? "default" : String(item.equals ?? item.id ?? `case ${index + 1}`),
      targetId: item.targetId || "",
    }));
  }

  return (normalized.routes || []).map((route, index) => ({
    key: `${route.outcome || "route"}_${index}`,
    label: route.outcome || `route ${index + 1}`,
    targetId: route.targetId || "",
  }));
}
