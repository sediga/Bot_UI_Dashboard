import { useEffect, useMemo, useState } from "react";
import { workflowNodeMeta, normalizeWorkflowNode } from "../../utils/workflowNodes";

function prettyJson(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseJson(raw, label, fallback = {}) {
  try {
    return JSON.parse(raw || prettyJson(fallback));
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function createRoute(index = 0) {
  return { outcome: `route_${index + 1}`, targetId: "", whenText: "" };
}

function createSwitchCase(index = 0) {
  return {
    id: `case_${Date.now()}_${index}`,
    equals: "",
    isDefault: index === 0,
    targetId: "",
  };
}

function createWaitEvent(index = 0) {
  return {
    eventType: index === 0 ? "email_received" : "",
    outcome: index === 0 ? "email_received" : `event_${index + 1}`,
    matchText: "{}",
  };
}

function normalizeRoutes(routes) {
  return Array.isArray(routes)
    ? routes.map((route, index) => ({
        outcome: String(route?.outcome || `route_${index + 1}`).trim(),
        targetId: String(route?.targetId || "").trim(),
        whenText: route?.when ? prettyJson(route.when) : "",
      }))
    : [];
}

function normalizeSwitchCases(cases) {
  return Array.isArray(cases)
    ? cases.map((item, index) => ({
        id: String(item?.id || `case_${index + 1}`).trim(),
        equals: item?.equals ?? "",
        isDefault: Boolean(item?.isDefault),
        targetId: String(item?.targetId || "").trim(),
      }))
    : [];
}

function normalizeWaitEvents(events) {
  return Array.isArray(events)
    ? events.map((item, index) => ({
        eventType: String(item?.eventType || "").trim(),
        outcome: String(item?.outcome || `event_${index + 1}`).trim(),
        matchText: prettyJson(item?.match ?? {}),
      }))
    : [];
}

function NodeField({ label, children, hint = "" }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint ? <div className="mt-1 text-[11px] text-gray-500">{hint}</div> : null}
    </div>
  );
}

function RouteEditor({ routes, setRoutes, availableNodes, nodeId }) {
  const options = useMemo(
    () => (availableNodes || []).filter((item) => item.id && item.id !== nodeId),
    [availableNodes, nodeId]
  );

  const updateRoute = (index, patch) => {
    setRoutes((prev) => prev.map((route, routeIndex) => (routeIndex === index ? { ...route, ...patch } : route)));
  };

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700">Routes</div>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
          onClick={() => setRoutes((prev) => [...prev, createRoute(prev.length)])}
        >
          Add Route
        </button>
      </div>

      {!routes.length ? <div className="text-xs text-gray-500">No routes configured yet.</div> : null}

      {routes.map((route, index) => (
        <div key={`${route.outcome || "route"}_${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NodeField label="Outcome">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={route.outcome}
                onChange={(e) => updateRoute(index, { outcome: e.target.value })}
                placeholder="completed"
              />
            </NodeField>

            <NodeField label="Target Node Id" hint="Pick an existing node or type an id to connect later.">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                list={`workflow-node-targets-${nodeId || "new"}`}
                value={route.targetId}
                onChange={(e) => updateRoute(index, { targetId: e.target.value })}
                placeholder="node_next"
              />
            </NodeField>
          </div>

          <NodeField label="Optional Route Filter JSON">
            <textarea
              className="min-h-[88px] w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
              value={route.whenText}
              onChange={(e) => updateRoute(index, { whenText: e.target.value })}
              placeholder='{"equals": "approved"}'
            />
          </NodeField>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => setRoutes((prev) => prev.filter((_, routeIndex) => routeIndex !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <datalist id={`workflow-node-targets-${nodeId || "new"}`}>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name || item.id}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function SwitchCaseEditor({ cases, setCases, availableNodes, nodeId }) {
  const options = useMemo(
    () => (availableNodes || []).filter((item) => item.id && item.id !== nodeId),
    [availableNodes, nodeId]
  );

  const updateCase = (index, patch) => {
    setCases((prev) => prev.map((item, caseIndex) => (caseIndex === index ? { ...item, ...patch } : item)));
  };

  const setDefaultCase = (index) => {
    setCases((prev) => prev.map((item, caseIndex) => ({ ...item, isDefault: caseIndex === index })));
  };

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700">Switch Cases</div>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
          onClick={() => setCases((prev) => [...prev, createSwitchCase(prev.length)])}
        >
          Add Case
        </button>
      </div>

      {cases.map((item, index) => (
        <div key={item.id || `case_${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NodeField label="Case Id">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={item.id}
                onChange={(e) => updateCase(index, { id: e.target.value })}
                placeholder="case_pending"
              />
            </NodeField>
            <NodeField label="Target Node Id">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                list={`workflow-switch-targets-${nodeId || "new"}`}
                value={item.targetId}
                onChange={(e) => updateCase(index, { targetId: e.target.value })}
                placeholder="node_next"
              />
            </NodeField>
          </div>

          <NodeField label="Equals">
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={item.equals}
              onChange={(e) => updateCase(index, { equals: e.target.value })}
              placeholder="approved"
              disabled={item.isDefault}
            />
          </NodeField>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-gray-700">
              <input
                type="radio"
                name={`workflow-switch-default-${nodeId || "new"}`}
                checked={Boolean(item.isDefault)}
                onChange={() => setDefaultCase(index)}
              />
              Default case
            </label>
            <button
              type="button"
              className="text-xs text-red-600 underline"
              disabled={cases.length <= 1}
              onClick={() => setCases((prev) => prev.filter((_, caseIndex) => caseIndex !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <datalist id={`workflow-switch-targets-${nodeId || "new"}`}>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name || item.id}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function WaitEventEditor({ events, setEvents }) {
  const updateEvent = (index, patch) => {
    setEvents((prev) => prev.map((item, eventIndex) => (eventIndex === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-700">Event Triggers</div>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
          onClick={() => setEvents((prev) => [...prev, createWaitEvent(prev.length)])}
        >
          Add Event
        </button>
      </div>

      {events.map((item, index) => (
        <div key={`${item.outcome || "event"}_${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NodeField label="Event Type">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={item.eventType}
                onChange={(e) => updateEvent(index, { eventType: e.target.value })}
                placeholder="email_received"
              />
            </NodeField>
            <NodeField label="Outcome">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={item.outcome}
                onChange={(e) => updateEvent(index, { outcome: e.target.value })}
                placeholder="email_received"
              />
            </NodeField>
          </div>

          <NodeField label="Match JSON">
            <textarea
              className="min-h-[88px] w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
              value={item.matchText}
              onChange={(e) => updateEvent(index, { matchText: e.target.value })}
              placeholder='{"subjectContains": "PA request"}'
            />
          </NodeField>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-red-600 underline"
              onClick={() => setEvents((prev) => prev.filter((_, eventIndex) => eventIndex !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkflowNodeForm({
  mode = "create",
  initialNode,
  availableFlows = [],
  availableNodes = [],
  onSave,
  onCancel,
}) {
  const [node, setNode] = useState(() => normalizeWorkflowNode(initialNode));
  const [runFlowPath, setRunFlowPath] = useState("");
  const [inputText, setInputText] = useState("{}");
  const [routes, setRoutes] = useState([]);
  const [switchCases, setSwitchCases] = useState([]);
  const [waitEvents, setWaitEvents] = useState([]);

  useEffect(() => {
    const normalized = normalizeWorkflowNode(initialNode);
    setNode(normalized);
    setInputText(prettyJson(normalized.input || {}));
    setRoutes(normalizeRoutes(normalized.routes));
    setSwitchCases(normalizeSwitchCases(normalized.switch?.cases));
    setWaitEvents(normalizeWaitEvents(normalized.waitForAny));

    const matchedFlow = (availableFlows || []).find((item) => item.id === normalized.flowRef?.flowId);
    setRunFlowPath(matchedFlow?.path || "");
  }, [initialNode, availableFlows]);

  const meta = workflowNodeMeta(node?.type);
  const buttonLabel = mode === "edit" ? "Save Node" : "Add Node";

  const handleSave = () => {
    try {
      const next = normalizeWorkflowNode(node);

      if (!next.id) {
        alert("Node id is required.");
        return;
      }

      if (next.type === "runFlow") {
        next.input = parseJson(inputText, "Input JSON", {});
        next.routes = routes.map((route, index) => {
          const prepared = {
            outcome: String(route.outcome || `route_${index + 1}`).trim(),
            targetId: String(route.targetId || "").trim(),
          };
          if (String(route.whenText || "").trim()) {
            prepared.when = parseJson(route.whenText, `Route ${index + 1} filter`, {});
          }
          return prepared;
        });
      }

      if (next.type === "switchValue") {
        next.switch = {
          source: String(node.switch?.source || "").trim(),
          cases: switchCases.map((item, index) => ({
            id: String(item.id || `case_${index + 1}`).trim(),
            equals: item.isDefault ? "" : item.equals,
            isDefault: Boolean(item.isDefault),
            targetId: String(item.targetId || "").trim(),
          })),
        };
      }

      if (next.type === "delay") {
        next.delay = {
          seconds: node.delay?.seconds === "" ? undefined : node.delay?.seconds,
          minutes: node.delay?.minutes === "" ? undefined : node.delay?.minutes,
          hours: node.delay?.hours === "" ? undefined : node.delay?.hours,
          days: node.delay?.days === "" ? undefined : node.delay?.days,
        };
        next.routes = routes.map((route, index) => {
          const prepared = {
            outcome: String(route.outcome || `route_${index + 1}`).trim(),
            targetId: String(route.targetId || "").trim(),
          };
          if (String(route.whenText || "").trim()) {
            prepared.when = parseJson(route.whenText, `Route ${index + 1} filter`, {});
          }
          return prepared;
        });
      }

      if (next.type === "waitForEvent") {
        next.waitForAny = waitEvents.map((item, index) => ({
          eventType: String(item.eventType || "").trim(),
          outcome: String(item.outcome || `event_${index + 1}`).trim(),
          match: parseJson(item.matchText, `Event ${index + 1} match JSON`, {}),
        }));
        next.routes = routes.map((route, index) => {
          const prepared = {
            outcome: String(route.outcome || `route_${index + 1}`).trim(),
            targetId: String(route.targetId || "").trim(),
          };
          if (String(route.whenText || "").trim()) {
            prepared.when = parseJson(route.whenText, `Route ${index + 1} filter`, {});
          }
          return prepared;
        });
      }

      if (next.type === "humanReview") {
        next.review = {
          queue: String(node.review?.queue || "").trim(),
          title: String(node.review?.title || "").trim(),
          instructions: String(node.review?.instructions || ""),
        };
        next.routes = routes.map((route, index) => {
          const prepared = {
            outcome: String(route.outcome || `route_${index + 1}`).trim(),
            targetId: String(route.targetId || "").trim(),
          };
          if (String(route.whenText || "").trim()) {
            prepared.when = parseJson(route.whenText, `Route ${index + 1} filter`, {});
          }
          return prepared;
        });
      }

      if (next.type === "end") {
        next.result = {
          status: String(node.result?.status || "completed").trim(),
          reason: String(node.result?.reason || "").trim(),
        };
      }

      onSave?.(next);
    } catch (err) {
      alert(err?.message || "Could not save this node.");
    }
  };

  const flowOptions = useMemo(
    () => (availableFlows || []).filter((item) => String(item?.type || "flow").toLowerCase() !== "workflow"),
    [availableFlows]
  );

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-blue-700">Step 2: Configure</div>

      <div className={`rounded-md border px-3 py-2 text-xs ${meta.tone}`}>
        <div className="font-semibold">{meta.title}</div>
        <div className="mt-1">{meta.description}</div>
      </div>

      <div className="rounded-md border border-gray-200 p-3 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <NodeField label="Node Name">
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={node.name || ""}
              onChange={(e) => setNode((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={meta.title}
            />
          </NodeField>

          <NodeField label="Node Id">
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={node.id || ""}
              onChange={(e) => setNode((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="node_review"
            />
          </NodeField>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={node.enabled !== false}
            onChange={(e) => setNode((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          Enabled
        </label>
      </div>

      {node.type === "runFlow" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 p-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <NodeField label="Saved Flow">
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={runFlowPath}
                  onChange={(e) => {
                    const nextPath = e.target.value;
                    const selected = flowOptions.find((item) => item.path === nextPath);
                    setRunFlowPath(nextPath);
                    setNode((prev) => ({
                      ...prev,
                      flowRef: {
                        ...prev.flowRef,
                        flowId: String(selected?.id || prev.flowRef?.flowId || ""),
                      },
                    }));
                  }}
                >
                  <option value="">-- Choose saved flow --</option>
                  {flowOptions.map((item) => (
                    <option key={item.path} value={item.path}>
                      {item.name || item.path}
                    </option>
                  ))}
                </select>
              </NodeField>

              <NodeField label="Flow Id" hint="Use the saved flow picker above or enter an id manually.">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={node.flowRef?.flowId || ""}
                  onChange={(e) => setNode((prev) => ({ ...prev, flowRef: { ...(prev.flowRef || {}), flowId: e.target.value } }))}
                  placeholder="123"
                />
              </NodeField>
            </div>

            <NodeField label="Pinned Flow Hash">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={node.flowRef?.flowHash || ""}
                onChange={(e) => setNode((prev) => ({ ...prev, flowRef: { ...(prev.flowRef || {}), flowHash: e.target.value } }))}
                placeholder="Optional hash"
              />
            </NodeField>

            <NodeField label="Input JSON">
              <textarea
                className="min-h-[120px] w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='{"caseId": "{{context.caseId}}"}'
              />
            </NodeField>
          </div>

          <RouteEditor routes={routes} setRoutes={setRoutes} availableNodes={availableNodes} nodeId={node.id} />
        </div>
      ) : null}

      {node.type === "switchValue" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 p-3">
            <NodeField label="Switch Source" hint="Use a template like {{context.status}} or {{vars.kind}}.">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={node.switch?.source || ""}
                onChange={(e) =>
                  setNode((prev) => ({
                    ...prev,
                    switch: { ...(prev.switch || {}), source: e.target.value },
                  }))
                }
                placeholder="{{context.status}}"
              />
            </NodeField>
          </div>

          <SwitchCaseEditor
            cases={switchCases}
            setCases={setSwitchCases}
            availableNodes={availableNodes}
            nodeId={node.id}
          />
        </div>
      ) : null}

      {node.type === "delay" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 p-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["seconds", "minutes", "hours", "days"].map((key) => (
                <NodeField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={node.delay?.[key] ?? ""}
                    onChange={(e) =>
                      setNode((prev) => ({
                        ...prev,
                        delay: {
                          ...(prev.delay || {}),
                          [key]: e.target.value === "" ? "" : Number(e.target.value),
                        },
                      }))
                    }
                  />
                </NodeField>
              ))}
            </div>
          </div>

          <RouteEditor routes={routes} setRoutes={setRoutes} availableNodes={availableNodes} nodeId={node.id} />
        </div>
      ) : null}

      {node.type === "waitForEvent" ? (
        <div className="space-y-3">
          <WaitEventEditor events={waitEvents} setEvents={setWaitEvents} />
          <RouteEditor routes={routes} setRoutes={setRoutes} availableNodes={availableNodes} nodeId={node.id} />
        </div>
      ) : null}

      {node.type === "humanReview" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 p-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <NodeField label="Queue">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={node.review?.queue || ""}
                  onChange={(e) =>
                    setNode((prev) => ({
                      ...prev,
                      review: { ...(prev.review || {}), queue: e.target.value },
                    }))
                  }
                  placeholder="default"
                />
              </NodeField>
              <NodeField label="Title">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={node.review?.title || ""}
                  onChange={(e) =>
                    setNode((prev) => ({
                      ...prev,
                      review: { ...(prev.review || {}), title: e.target.value },
                    }))
                  }
                  placeholder="Review required"
                />
              </NodeField>
            </div>

            <NodeField label="Instructions">
              <textarea
                className="min-h-[120px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={node.review?.instructions || ""}
                onChange={(e) =>
                  setNode((prev) => ({
                    ...prev,
                    review: { ...(prev.review || {}), instructions: e.target.value },
                  }))
                }
                placeholder="Tell the reviewer what to check."
              />
            </NodeField>
          </div>

          <RouteEditor routes={routes} setRoutes={setRoutes} availableNodes={availableNodes} nodeId={node.id} />
        </div>
      ) : null}

      {node.type === "end" ? (
        <div className="rounded-md border border-gray-200 p-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <NodeField label="Result Status">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={node.result?.status || ""}
                onChange={(e) =>
                  setNode((prev) => ({
                    ...prev,
                    result: { ...(prev.result || {}), status: e.target.value },
                  }))
                }
                placeholder="completed"
              />
            </NodeField>

            <NodeField label="Reason">
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={node.result?.reason || ""}
                onChange={(e) =>
                  setNode((prev) => ({
                    ...prev,
                    result: { ...(prev.result || {}), reason: e.target.value },
                  }))
                }
                placeholder="Workflow completed"
              />
            </NodeField>
          </div>
        </div>
      ) : null}

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">
          {mode === "edit" ? "Cancel" : "Back"}
        </button>
        <button onClick={handleSave} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
