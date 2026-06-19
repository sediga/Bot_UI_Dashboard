import { useEffect, useMemo, useRef, useState } from "react";
import config from "../config";
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";
import FlowSelector from "./FlowSelector";
import SecretMapperModal from "./smartsteps/SecretMapperModal";
import { makeSelectorLlmHelper } from "../helpers/selectorLlmHelper";
import {
  getFlowExecutionStatus,
  listFlows,
  loadFlow as loadFlowFromApi,
  saveFlow,
  syncFlowIdMetadata,
} from "../utils/flowApi";
import { detectDocumentKind, normalizeStep, toFlowPayload, validateFlowSteps } from "../utils/flowSchema";

export default function StepBuilder({
  onEnsureWebSocket,
  isMounted,
  addStep,
  currentLoopId,
  setCurrentLoopId,
  steps,
  clearSteps,
  updateStepWithImprovedSelector,
  setPickedTarget,
  setSteps,
  agentStatus,
  logs,
  setLogs,
  rawMessages,
  setRawMessages,
  eventBus,
  sessionDatasets
}) {
  const [status, setStatus] = useState("idle");
  const [urlInput, setUrlInput] = useState("");
  const [loopName, setLoopName] = useState("");
  const [saveFileName, setSaveFileName] = useState("");
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [loopType, setLoopType] = useState("counter");
  const [loopCount, setLoopCount] = useState(1);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [showParamModal, setShowParamModal] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);
  const [loopColumns, setLoopColumns] = useState([]);
  const [secretCtx, setSecretCtx] = useState(null);      
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [isFetchingFlows, setIsFetchingFlows] = useState(false);
  const [loadedFlowMeta, setLoadedFlowMeta] = useState({ flowId: "", flowPath: "" });

  const token = localStorage.getItem("botflows_token");
  // const [logs, setLogs] = useState([]);
  const { user } = useAuth();
  const userId = user?.userId;
  const messageQueueRef = useRef([]);
  const currentLoopIdRef = useRef(currentLoopId);
  const seenEventIdsRef = useRef(new Set());           // strong dedupe
  const seenSigRef = useRef(new Map());                // fallback dedupe (LRU-ish)
  const SEEN_LIMIT = 10000;                            // cap memory usage
  
  
  const seenSecretIdsRef = useRef(new Set());
  const llmRef = useRef(null);

  const [validationSummary, setValidationSummary] = useState("");
  const fileInputRef = useRef(null);

  const fetchFlows = async () => {
    setIsFetchingFlows(true);
    try {
      const data = await listFlows();
      const next = Array.isArray(data) ? data.filter((item) => String(item?.type || "flow").toLowerCase() !== "workflow") : [];
      setAvailableFlows(next);
    } catch (err) {
      console.error("Failed to load flows:", err);
      setAvailableFlows([]);
    } finally {
      setIsFetchingFlows(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [token]);

  useEffect(() => {
    llmRef.current = makeSelectorLlmHelper({
      baseUrl: config.apiBaseUrl,              // or config.agentServerUrl
      endpoint: "/api/selector/suggest",
      authType: config.authType || "api_key",
      getToken: () => localStorage.getItem("botflows_token"),
      concurrency: 2,
      onResult: (step, res) => {
        const normalize = (s, fallbackSource = "unknown", fallbackScore = 0) => {
          if (!s) return null;
          if (typeof s === "string") {
            const sel = s.trim();
            return sel ? { selector: sel, source: fallbackSource, score: fallbackScore } : null;
          }
          const sel = (s.selector || s.replaySelector || s.css || "").trim();
          return sel ? { selector: sel, source: s.source || fallbackSource, score: Number(s.score ?? fallbackScore) } : null;
        };

        // 1) choose best selector based on score
        const bestSelStr = (res.bestSelector || step.improvedSelector || step.selector || "").trim();
        const best = bestSelStr ? { selector: bestSelStr, source: "llm:best", score: 10_000 } : null;

        // 2) Bring in LLM suggestions (give them a high default score unless they provide one)
        const llmList = (res.suggestions || [])
          .map(s => normalize(s, "llm:suggestion", 9_000))
          .filter(Boolean);

        // 3) Existing selectors (objects) + the recorded single selector
        const existing = [
          ...(Array.isArray(step.selectors) ? step.selectors.map(o => normalize(o, o?.source, o?.score)) : []),
          normalize(step.selector, "recorded", 0),
        ].filter(Boolean);

        // 4) Merge & de-dupe by selector string, keeping the higher score on conflicts
        const bySel = new Map();
        [...llmList, ...existing].filter(Boolean).forEach(s => {
          const prev = bySel.get(s.selector);
          if (!prev || s.score > prev.score) bySel.set(s.selector, s);
        });

        // 5) Sort by score DESC (LLM items will naturally float to the top)
        const ordered = Array.from(bySel.values()).sort((a, b) => b.score - a.score);

        // 6) Write back so the player tries LLM/high-score first automatically
        updateStepWithImprovedSelector(step.id, {
          selector: ordered[0]?.selector || step.selector,
          selectors: ordered,                     // keep as objects with score/source
          improvedSelector: ordered[0]?.selector, // mirror top pick
          suggestions: res.suggestions,
          bestSelectorScore: res.score,
          bestSelectorReason: res.reason,
          promptVersion: res.promptVersion,
          label: (res.label && res.label.trim()) ? res.label : step.label,
          recordedSelector: step.selector,        // optional: for debugging
        });
      }
    });
    return () => { llmRef.current = null; };
    // include deps that would actually change your API wiring if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateStepWithImprovedSelector, config.apiBaseUrl, config.authType]);

  useEffect(() => {
    currentLoopIdRef.current = currentLoopId;
  }, [currentLoopId]);

  // console.log("builder agentStatus:", agentStatus);
  function hasPlaceholder(val) {
    return typeof val === "string" && /{{\s*[\w.]+\s*}}/.test(val);
  }

  function getStepLabel(step) {
    const action = step.action || "Action";
    const rawVal = (step.value !== undefined ? step.value : step.optionText);
    const pretty = Array.isArray(rawVal) ? rawVal.join(", ") : rawVal;
    const text =
      (pretty && String(pretty)) ||
      step.elementText ||
      step.innerText ||
      step.attributes?.["aria-label"] ||
      step.attributes?.["data-testid"] ||
      step.attributes?.["name"] ||
      "Unknown";

    return `${action.charAt(0).toUpperCase() + action.slice(1)}: ${text.trim()}`;
  }

function guessSecretName(p) {
  const a = p.attributes || {};
  const c = [a.name, a.id, a["aria-label"], a.placeholder, p.innerText, p.elementText].filter(Boolean);
  const raw = (c[0] || "secret").toLowerCase();
  return raw.replace(/[^a-z0-9]+/gi,"_").replace(/^_+|_+$/g,"").slice(0,40) || "secret";
}

useEffect(() => {
  const interval = setInterval(() => {
    const batch = messageQueueRef.current;
    if (batch.length === 0) return;
    // swap buffers so new arrivals are not lost while we process
    messageQueueRef.current = [];
    // stable ordering within this batch
    batch.sort((a, b) => {
      const ta = (a.payload?.timestamp ?? a.timestamp ?? 0);
      const tb = (b.payload?.timestamp ?? b.timestamp ?? 0);
      return ta - tb;
    });
    const newSteps = [];
    batch.forEach((raw) => {
        try {
          const channel = raw._channel || "event";
          const payload = raw.payload ?? raw;
          const kind = String(payload.type || raw.type || "").toLowerCase();
          // ignore heartbeats/noise
          if (kind === "ping" || kind === "ready" || kind === "heartbeat") return;
          // Record focus for context but don't emit a step or call LLM
          if (kind === "focus") {
            // keep anything you find handy for later correlation
            // e.g., last focused selector/snapshot/time
            // lastFocusRef.current = { selector: payload.selector, ts: payload.timestamp, es: payload.elementSnapshot };
            return;
          }
          // StepBuilder processes only events; logs are handled by parent
          if (channel !== "event") return;

          if (channel === "event") {
            if (payload.type === "targetPicked") {
              setPickedTarget(payload);
              return;
            }

           const evId = payload.eventId;
            if (evId) {
              if (seenEventIdsRef.current.has(evId)) return;
              seenEventIdsRef.current.add(evId);
              // prune occasionally
              if (seenEventIdsRef.current.size > SEEN_LIMIT) {
                // cheap reset: keep only the last half by recreating
                const keep = Array.from(seenEventIdsRef.current).slice(-SEEN_LIMIT/2);
                seenEventIdsRef.current = new Set(keep);
              }
            } else {
              // --------- fallback dedupe by signature ----------
              const sigBase = [
                payload.type,
                payload.action,
                payload.selector || payload.improvedSelector || payload.devToolsSelector || "",
                Math.floor((payload.timestamp ?? Date.now()) / 250) // 250ms buckets
              ].join("|");
              const already = seenSigRef.current.get(sigBase);
              if (already) return;
              seenSigRef.current.set(sigBase, 1);
              if (seenSigRef.current.size > SEEN_LIMIT) {
                // drop oldest ~1/2 by recreating map
                const half = Math.floor(SEEN_LIMIT / 2);
                const lastHalf = Array.from(seenSigRef.current.keys()).slice(-half);
                const next = new Map();
                lastHalf.forEach(k => next.set(k, 1));
                seenSigRef.current = next;
              }
            }

            const isSmartColumnClick = payload.type === "clickInColumn";
            const es = payload.elementSnapshot || {};
            // Build from payload first so new agent fields flow through automatically
            const EXCLUDE = new Set(["__proto__", "prototype", "constructor"]); // safety

            const safePayload = Object.fromEntries(
              Object.entries(payload).filter(([k]) => !EXCLUDE.has(k))
            );

            const step = {
              ...safePayload,                               // keep everything the agent sent
              id: crypto.randomUUID(),                      // UI step id (do NOT let payload override)
              type: "uiAction",                             // normalize step type
              label: getStepLabel(payload),
              labelText: (es.labelText ?? payload.labelText) ?? null,
              anchorText: (es.anchorText ?? payload.anchorText) ?? null,
              domPath: (es.domPath ?? payload.domPath) ?? null,
              accessibleName: (payload.accessibleName ?? es.accessibleName) ?? null,
              role: (payload.role ?? es.role) ?? null,
            };

            // normalize a few shapes so downstream code is safe
            step.classList ||= [];
            step.attributes ||= {};
            step.selectors ||= [];
            if (step.isVisible === undefined) step.isVisible = true;

            // ---- keep your existing loop-specific enrichment ----
            if (currentLoopIdRef.current) {
              step.parentId = currentLoopIdRef.current;
              const parent = steps.find((s) => s.id === currentLoopIdRef.current);
              if (parent?.type === "switchCase" && !step.caseId) {
                const firstCaseId = parent.cases?.[0]?.id;
                if (firstCaseId) step.caseId = firstCaseId;
              }

              if (isSmartColumnClick) {
                step.columnIndex = payload.columnIndex;
                step.columnHeader = payload.columnHeader;
                step.isSmartColumn = true;
                step.smartActionType = payload.actionType || "click";
              }

              if (["change", "type", "select", "click"].includes(step.action)) {
                const dynamicVal = step.attributes?.["data-dynamic-value"];
                if (typeof dynamicVal === "string" && dynamicVal.startsWith("{{") && dynamicVal.endsWith("}}")) {
                  step.dynamicValue = dynamicVal;
                  step.isDynamic = true;
                  step.transformType = step.attributes?.["data-transform-type"] || null;
                  step.transform = step.attributes?.["data-transform"] || null;
                  step.mappedScope = step.attributes?.["data-botflows-mapped"] || "global";
                }
              }
            }

            if (payload.metadata?.validation?.status === "failed") {
              step.validationStatus = "failed";
              step.validationReason = payload.metadata.validation.reason;
            }


            const isSecretEvt =
              payload.isSensitive &&
              typeof payload.value === "string" &&
              /^\{\{secret:/.test(payload.value) &&
              payload.sensitiveToken &&
              payload.eventId;

            if (isSecretEvt && !seenSecretIdsRef.current.has(payload.eventId)) {
              seenSecretIdsRef.current.add(payload.eventId);

              fetch(`${config.agentServerUrl}/api/overlay/show`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Sensitive input detected. Map it to a Secret in dashboard" })
              });

              setSecretCtx({
                eventId: payload.eventId,
                suggestedName: guessSecretName(payload),
              });
              setShowSecretModal(true);
            }

            newSteps.push(normalizeStep(step));
           
            try {
              const actionStr = typeof step.action === "string" ? step.action.toLowerCase() : "";
              const actionable = ["click", "change", "select", "type", "dblclick", "setradio", "setcheckbox", "setselect"].includes(actionStr);
              const hasCandidates = (Array.isArray(step.selectors) && step.selectors.length) || !!step.selector;
              const visibleEnough = step.isVisible !== false; // allow undefined/true
              if (actionable && hasCandidates && visibleEnough) {
                llmRef.current?.enqueue(step);
              }
            } 
            catch 
            {
              // don't let LLM issues block the main flow
              console.warn("LLM enqueue failed");
            }
            
            try {
              if (!step.label || step.label.includes("Unknown")) {
                const updatedLabel = getStepLabel(payload);
                step.label = updatedLabel;
                updateStepWithImprovedSelector(step.id, { label: updatedLabel });
              }
            } catch (err) {
              console.warn("Failed to update label:", err);
            }
          }
        } catch (err) {
          console.error("Failed to process raw message:", err);
        }
      });
      

      if (newSteps.length > 0) {
        setSteps(prev => validateFlowSteps([...prev, ...newSteps]).steps);
      }

    }, 100); // Adjust interval if needed

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!eventBus) return;
    const onMsg = (e) => {
      const { channel, raw } = e.detail || {};
      if (!raw) return;
      // Quick guard to keep only event/log shapes we understand
      // Note: logs are ignored by StepBuilder; RecorderDashboard owns them.
      messageQueueRef.current.push({ ...raw, _channel: channel || "event" });
    };
    eventBus.addEventListener("flowtra:msg", onMsg);
    return () => eventBus.removeEventListener("flowtra:msg", onMsg);
  }, [eventBus]);


  const handleNavigate = async () => {
    if (!urlInput.trim()) return;
    await onEnsureWebSocket("event");
    await onEnsureWebSocket("log");

    const url = urlInput.trim();
    const formattedUrl = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    setLogs([]); 
    setUrlInput(formattedUrl);

    try {
      clearSteps();
      const navigateStep = normalizeStep({
        id: crypto.randomUUID(),
        type: "navigate",
        url: formattedUrl,
      });
      addStep(navigateStep);
      setCurrentLoopId?.(navigateStep.id);
      const authType = config.authType || "jwt";
      const headers = {
        "Content-Type": "application/json",
      };

      if (authType === "jwt") {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (authType === "api_key") {
        headers["x-api-key"] = token;
      }

      const res = await fetch(`${config.agentServerUrl}/api/record`, {
        method: "POST",
        headers,
        body: JSON.stringify({ url : formattedUrl }),
      });
      if (!res.ok) throw new Error("Failed to start recording");

    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. Is agent running?");
    }
  };

  const handleStartLoop = () => {
    if (!loopName.trim()) return;

    const id = crypto.randomUUID();

    const criteria = loopType === "counter"
      ? { type: "counter", count: loopCount }
      : { type: loopType };

    const loopStep = normalizeStep({
      id,
      type: "counterloop",
      action: "counterloop",
      source: loopName.trim(),
      criteria,
      steps: [],
    });

    addStep(loopStep);
    setCurrentLoopId(id);
    setLoopName("");
  };

  const handleSave = async () => {
    if (!saveFileName.trim()) return;
    const cleanName = saveFileName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const validated = validateFlowSteps(steps);
    setSteps(validated.steps);
    if (validated.hasErrors) {
      setValidationSummary("Fix step validation issues before saving.");
      alert("Cannot save: some steps are invalid. Please review highlighted steps.");
      return;
    }

    try {
      const data = await saveFlow(cleanName, validated.steps);
      setValidationSummary("");
      alert(data.message || "Flow saved.");
      await fetchFlows();
    } catch (err) {
      console.error("Failed to save flow:", err);
      alert("Error saving flow");
    }

    setShowSavePopup(false);
    setSaveFileName("");
  };

  const handlePreviewReplay = async () => {
    try {
      const validated = validateFlowSteps(steps);
      if (validated.hasErrors) {
        // keep this only for invalid cases so errors can be reviewed in the UI
        setSteps(validated.steps);
        setValidationSummary("Fix step validation issues before preview.");
        alert("Cannot preview: some steps are invalid. Please review highlighted steps.");
        return;
      }
      window.dispatchEvent(new Event("flowtra:preview-start"));
      const authType = config.authType || "jwt";
      await onEnsureWebSocket("event");
      await onEnsureWebSocket("log");

      const normalizedToken = token?.startsWith("Bearer ")
        ? token.slice("Bearer ".length)
        : token;
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey || ""}`,
      };

      if (authType === "jwt") {
        headers["Authorization"] = normalizedToken ? `Bearer ${normalizedToken}` : "";
      } else if (authType === "api_key") {
        headers["x-api-key"] = normalizedToken || `${config.apiKey || ""}`;
      }

      await fetch(`${config.agentServerUrl}/api/overlay/show`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: "Previewing now, Will resume after..." }),
      }).catch(() => {});

      const payload = toFlowPayload(validated.steps);
      const selectedFlowMeta = availableFlows.find((f) => f.path === selectedFlow) || {};
      if (selectedFlow) {
        try {
          const status = await getFlowExecutionStatus(selectedFlow);
          if (status?.isExecutionEnabled === false) {
            const msg = `Preview blocked: ${status?.disableReason || "flow execution is disabled by admin policy."}`;
            setValidationSummary(msg);
            alert(msg);
            return;
          }
        } catch (statusErr) {
          console.warn("Execution status precheck unavailable. Continuing preview.", statusErr);
        }
      }
      const res = await fetch(`${config.agentServerUrl}/api/preview-replay`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          steps: payload,
          flowPath: selectedFlow || undefined,
          flowId: selectedFlowMeta.id || undefined,
          triggerType: "manual",
        }),
      });

      await fetch(`${config.agentServerUrl}/api/overlay/hide`, {
        method: "POST",
        headers
      }).catch(() => {});
      
      if (!res.ok) {
        const rawText = await res.text().catch(() => "");
        let detail = rawText;
        try {
          const parsed = JSON.parse(rawText);
          detail = parsed?.detail || parsed?.error || rawText;
        } catch {
          // keep raw text fallback
        }
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const result = await res.json().catch(() => ({}));
      if (result.status !== "ok") {
        const msg = "Preview failed: " + (result.details || "Agent returned a non-ok status.");
        setValidationSummary(msg);
        alert(msg);
        return;
      }
      setValidationSummary("");
    } catch (err) {
      console.error("Preview replay error:", err);
      const msg = err?.message || "Preview replay failed.";
      setValidationSummary(msg);
      alert(msg);
    } finally {
      window.dispatchEvent(new Event("flowtra:preview-end"));
    }
  };

const loadFlow = async (selectedFlow) => {
    if (!selectedFlow) return;
    if (steps.length > 0) {
      const ok = window.confirm("Loading this flow will replace current steps. Continue?");
      if (!ok) return;
    }
    try {
      const data = await loadFlowFromApi(selectedFlow);
      const selectedFlowMeta = availableFlows.find((f) => f.path === selectedFlow) || {};
      const validated = validateFlowSteps(data);
      clearSteps();
      validated.steps.forEach((step) => addStep(step));
      setLoadedFlowMeta({
        flowId: String(selectedFlowMeta.id || ""),
        flowPath: selectedFlow || "",
      });
      if (validated.hasErrors) {
        setValidationSummary("Loaded flow has validation issues. Review highlighted steps.");
      } else {
        setValidationSummary("");
      }

      const firstNavStep = validated.steps.find(step => step.type === "navigate");
      if (firstNavStep?.url) {
        setUrlInput(firstNavStep.url);
      }
    } catch (err) {
      console.error("Failed to load flow", err);
      alert("Could not load flow");
    }
  };

  const applyLoadedSteps = (payload) => {
    const hasWrappedDocument = payload && typeof payload === "object" && !Array.isArray(payload) &&
      (Array.isArray(payload.document) || (payload.document && typeof payload.document === "object"));
    const documentPayload = hasWrappedDocument ? payload.document : payload;
    const documentKind = detectDocumentKind(documentPayload);

    if (documentKind === "workflow") {
      throw new Error(
        "This JSON is a workflow document. The Create Flow tab only edits plain flows. Use the Replay tab to view or run workflows."
      );
    }

    const isArray = Array.isArray(documentPayload);
    const isObjectWithSteps = documentPayload && typeof documentPayload === "object" && Array.isArray(documentPayload.steps);
    if (!isArray && !isObjectWithSteps) {
      throw new Error("Invalid flow JSON: expected steps[] or { steps: [] }.");
    }

    const sourceSteps = isArray ? documentPayload : documentPayload.steps;
    const validated = validateFlowSteps(sourceSteps);
    clearSteps();
    validated.steps.forEach((s) => addStep(s));
    setValidationSummary(validated.hasErrors ? "Loaded JSON has validation issues. Review highlighted steps." : "");
    if (isObjectWithSteps || hasWrappedDocument) {
      const metaSource = hasWrappedDocument ? payload : documentPayload;
      setLoadedFlowMeta({
        flowId: String(metaSource.flowId || documentPayload.flowId || documentPayload.id || ""),
        flowPath: String(metaSource.flowPath || documentPayload.flowPath || ""),
      });
    } else {
      setLoadedFlowMeta({ flowId: "", flowPath: "" });
    }

    // set URL from first navigate step (optional)
    const firstNav = validated.steps.find((s) => s.type?.toLowerCase?.() === "navigate" && s.url);
    if (firstNav?.url) setUrlInput(firstNav.url); // assumes you have setUrlInput / urlInput state
  };

  const handleLoadFile = async (e) => {
    try {
      const f = e.target.files?.[0];
      if (!f) return;
      if (steps.length > 0) {
        const ok = window.confirm("Importing JSON will replace current steps. Continue?");
        if (!ok) return;
      }
      const text = await f.text();
      const data = JSON.parse(text);
      applyLoadedSteps(data);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not load this JSON file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportJson = async () => {
    if (!steps.length) return;
    const validated = validateFlowSteps(steps);
    setSteps(validated.steps);
    if (validated.hasErrors) {
      setValidationSummary("Exported flow contains validation issues. Review highlighted steps.");
    }

    const payload = toFlowPayload(validated.steps);
    const selectedFlowMeta = availableFlows.find((f) => f.path === selectedFlow) || {};
    const flowId =
      String(selectedFlowMeta.id || loadedFlowMeta.flowId || "") ||
      (typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : "");
    const flowPath = selectedFlow || loadedFlowMeta.flowPath || "";
    if (flowPath && flowId) {
      try {
        await syncFlowIdMetadata(flowPath, flowId);
      } catch (err) {
        console.warn("Flow ID metadata sync failed. Continuing export.", err);
      }
    }
    const flowJson = {
      flowId,
      flowPath: flowPath || undefined,
      steps: payload,
    };
    const selectedBase = selectedFlow ? selectedFlow.split("/").pop()?.replace(/\.json$/i, "") : "";
    const fallback = saveFileName.trim() || selectedBase || "flow";
    const base = fallback.replace(/[^\w.-]/g, "_") || "flow";
    const filename = base.toLowerCase().endsWith(".json") ? base : `${base}.json`;

    const blob = new Blob([JSON.stringify(flowJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex-1 bg-gray-50 p-4 h-full min-h-0 flex flex-col">
      {/* Top static inputs */}
      <div className="space-y-4">
        {/* URL row */}
        <div className="w-full">
          <input
            type="text"
            className="enterUrl border rounded w-full p-2"
            placeholder="Enter URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
        </div>

        {/* Buttons row moved BELOW the URL field */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            onClick={handleNavigate}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
            title="Start/continue recording on the URL above"
            disabled={!urlInput.trim()}
          >
            Record
          </button>

          <button
            onClick={() => setShowSavePopup(true)}
            className="px-4 py-2 rounded bg-emerald-600 text-white"
            title="Save current steps"
            disabled={steps.length === 0}
          >
            Save
          </button>

          <button
            onClick={handlePreviewReplay}
            className="px-4 py-2 rounded bg-purple-600 text-white"
            title="Preview the current flow"
            disabled={steps.length === 0}
          >
            Preview
          </button>

          {/* NEW: Load from file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded bg-gray-800 text-white"
            title="Load steps from a local JSON file"
          >
            Import JSON
          </button>

          <button
            onClick={handleExportJson}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-800"
            title="Export current steps as JSON"
            disabled={steps.length === 0}
          >
            Export JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleLoadFile}
          />

        </div>

        <FlowSelector
          value={selectedFlow}
          onChange={(val) => {
            setSelectedFlow(val);
            loadFlow(val);
          }}
          label="Select Flow"
          fetchedFlows={availableFlows}
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {isFetchingFlows
              ? "Refreshing flows..."
              : (availableFlows.length ? `${availableFlows.length} saved flows` : "No saved flows found")}
          </span>
          <button
            onClick={fetchFlows}
            className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100"
            disabled={isFetchingFlows}
            type="button"
          >
            Refresh
          </button>
        </div>
        {validationSummary && (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {validationSummary}
          </div>
        )}
      </div>

      {/* Save Popup */}
      {showSavePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white shadow rounded p-4 space-y-2 border w-full max-w-sm">
            <label className="block font-medium">Save As:</label>
            <input
              type="text"
              className="border p-2 w-full rounded"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder="flow_name"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={handleSave} className="bg-green-600 text-white px-4 py-1 rounded">Save</button>
              <button onClick={() => setShowSavePopup(false)} className="bg-gray-400 text-white px-4 py-1 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Scrollable logs area */}
      <div className="flex-1 min-h-0 mt-4 overflow-y-auto">
        <StatusPanel status={agentStatus} logs={logs} onClear={() => setLogs([])} />
      </div>

{showSecretModal && secretCtx && (
  <SecretMapperModal
    open={showSecretModal}
    eventId={secretCtx.eventId}
    suggestedName={secretCtx.suggestedName}
    onClose={() => { setShowSecretModal(false); setSecretCtx(null); }}
    onMapped={(mappedScope, name) => {
      // mappedScope will always be "agent"
      setSteps(prev =>
        prev.map(s =>
          s.eventId === secretCtx.eventId
            ? {
                ...s,
                value: `{{secret:${mappedScope}/${name}}}`,
                secretRef: `${mappedScope}/${name}`,
                isSensitive: true,
              }
            : s
        )
      );
    }}
  />
)}

    </section>
  );
}
