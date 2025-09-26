import { useState, useEffect, useRef } from "react";
import config from "../config";
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";
import FlowSelector from "./FlowSelector";
import SecretMapperModal from "./smartsteps/SecretMapperModal";
import { makeSelectorLlmHelper } from "../helpers/selectorLlmHelper";

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
  eventBus
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
    const text =
      step.value ||
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

            newSteps.push(step);
           
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
        setSteps(prev => [...prev, ...newSteps]);
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
      const navigateStep = {
        id: crypto.randomUUID(),
        type: "navigate",
        url: formattedUrl,
      };
      addStep(navigateStep);
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

    const loopStep = {
      id,
      type: "counterloop",
      action: "counterloop",
      source: loopName.trim(),
      criteria,
      steps: [],
    };

    addStep(loopStep);
    setCurrentLoopId(id);
    setLoopName("");
  };

  const handleSave = async () => {
    if (!saveFileName.trim()) return;
    const cleanName = saveFileName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey}` // Load from env later
      };
      const res = await fetch(`${config.apiBaseUrl}/api/flows/save`, {
        method: "POST",
        headers,
        body: JSON.stringify({ filename: cleanName, steps }),
      });

      // const resAgent = await fetch(`${config.agentServerUrl}/api/stop`, {
      //   method: "POST",
      //   headers
      // });
      // if (!resAgent.ok) throw new Error("Failed to stop recording");

      const data = await res.json();
      alert(data.message || "Flow saved.");
      // setUrlInput("");
      // clearSteps();
    } catch (err) {
      console.error("Failed to save flow:", err);
      alert("Error saving flow");
    }

    setShowSavePopup(false);
    setSaveFileName("");
  };

  const handlePreviewReplay = async () => {
    try {
      const authType = config.authType || "jwt";
      await onEnsureWebSocket("event");
      await onEnsureWebSocket("log");

      const headers = {
        "Content-Type": "application/json",
      };

      if (authType === "jwt") {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (authType === "api_key") {
        headers["x-api-key"] = token;
      }

      const resOverlay = await fetch(`${config.agentServerUrl}/api/overlay/show`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: "Previewing now, Will resume after..." }),
      });
      console.log(`overlay response : (${ resOverlay.json()})`)
      const res = await fetch(`${config.agentServerUrl}/api/preview-replay`, {
        method: "POST",
        headers,
        body: JSON.stringify(steps),
      });

      const resOverlayStop = await fetch(`${config.agentServerUrl}/api/overlay/hide`, {
        method: "POST",
        headers
      });
      
      const result = await res.json();
      if (result.status !== "ok") {
        alert("Preview failed: " + result.details);
      }
    } catch (err) {
      console.error("Preview replay error:", err);
      alert("Preview replay failed.");
    }
  };

const loadFlow = async (selectedFlow) => {
    if (!selectedFlow) return;
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey}` // Load from env later
      };
      const res = await fetch(`${config.apiBaseUrl}/api/flows/load?path=${encodeURIComponent(selectedFlow)}`, {
        headers: headers,
      });
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid flow data");

      clearSteps();
      data.forEach((step) => addStep(step));

      const firstNavStep = data.find(step => step.type === "navigate");
      if (firstNavStep?.url) {
        setUrlInput(firstNavStep.url);
      }
    } catch (err) {
      console.error("Failed to load flow", err);
      alert("Could not load flow");
    }
  };

  return (
    <section className="flex-1 bg-gray-50 p-4 h-full min-h-0 flex flex-col">
      {/* Top static inputs */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="enterUrl border p-2 w-full rounded"
            placeholder="Enter URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button onClick={handleNavigate} className="record bg-blue-600 text-white px-3 py-2 rounded">Record</button>
          <button onClick={() => setShowSavePopup(true)} className="bg-green-600 text-white px-3 py-2 rounded">Save</button>
          <button onClick={handlePreviewReplay} className="bg-purple-600 text-white px-3 py-2 rounded">Preview</button>
        </div>

        <FlowSelector
          value={selectedFlow}
          onChange={(val) => {
            setSelectedFlow(val);
            loadFlow(val);
          }}
          label="Select Flow"
        />
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
        <StatusPanel status={agentStatus} logs={logs} />
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
