import { useState, useEffect, useRef } from "react";
import config from "../config";
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";
import FlowSelector from "./FlowSelector";
import SecretMapperModal from "./SecretMapperModal";

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
  setRawMessages
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
  
  
  const seenSecretIdsRef = useRef(new Set());

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

  useEffect(() => {
    console.log("📌 currentLoopId in StepBuilder:", currentLoopId);
  }, [currentLoopId]);

  // useEffect(() => {
  //   const fetchFlows = async () => {
  //     try {
  //       const headers = {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //         "x-api-key": config.apiKey
  //       };

  //       const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, { headers });
  //       if (!res.ok) {
  //         console.warn("Fetch failed:", res.status);
  //         return;
  //       }

  //       const data = await res.json();
  //       if (Array.isArray(data)) {
  //         setAvailableFlows(data);
  //       } else {
  //         console.warn("Unexpected data format:", data);
  //       }
  //     } catch (err) {
  //       console.error("Failed to fetch flow list", err);
  //     }
  //   };

  //   fetchFlows();
  // }, [token]);

  // console.log("🔄 render", rawMessages);
function guessSecretName(p) {
  const a = p.attributes || {};
  const c = [a.name, a.id, a["aria-label"], a.placeholder, p.innerText, p.elementText].filter(Boolean);
  const raw = (c[0] || "secret").toLowerCase();
  return raw.replace(/[^a-z0-9]+/gi,"_").replace(/^_+|_+$/g,"").slice(0,40) || "secret";
}
  useEffect(() => {
    const interval = setInterval(() => {
      if (messageQueueRef.current.length === 0) return;

      const newSteps = [];

      messageQueueRef.current.forEach((raw) => {
        try {
          const channel = raw._channel;
          const payload = raw.payload || raw;

          if (["log", "event"].includes(channel) && ["ping", "ready"].includes(raw.type)) return;

          if (channel === "log" && raw.type === "log") {
            setLogs(prev => [...prev, payload.message]);
            return;
          }

          if (channel === "event") {
            if (payload.type === "targetPicked") {
              setPickedTarget(payload);
              return;
            }

            const isSmartColumnClick = payload.type === "clickInColumn";

            const step = {
              id: crypto.randomUUID(),
              eventId: payload.eventId,   // 👈 add this
              type: "uiAction",
              action: payload.action,
              value: payload.value || null,
              url: payload.url || null,
              timestamp: payload.timestamp || Date.now(),
              label: getStepLabel(payload),
              selector: payload.selector,
              selectors: payload.selectors,
              improvedSelector: payload.improvedSelector,
              devToolsSelector: payload.devToolsSelector,
              tagName: payload.tagName,
              attributes: payload.attributes || {},
              innerText: payload.innerText,
              elementText: payload.elementText,
              classList: payload.classList || [],
              boundingBox: payload.boundingBox,
              frameContext: payload.frameContext || null,
              frameUrl: payload.frameUrl || null,
              isVisible: payload.isVisible ?? true,
              computedStyles: payload.computedStyles || {}
            };

            if (currentLoopIdRef.current) {
              step.parentId = currentLoopIdRef.current;

              if (isSmartColumnClick) {
                step.columnIndex = payload.columnIndex;
                step.columnHeader = payload.columnHeader;
                step.isSmartColumn = true;
                step.smartActionType = payload.actionType || "click";
              }

              if (["change", "type", "select", "click"].includes(payload.action)) {
                const dynamicVal = payload.attributes?.["data-dynamic-value"];
                if (dynamicVal?.startsWith("{{") && dynamicVal.endsWith("}}")) {
                  step.dynamicValue = dynamicVal;
                  step.isDynamic = true;
                  step.transformType = payload.attributes?.["data-transform-type"] || null;
                  step.transform = payload.attributes?.["data-transform"] || null;
                  step.mappedScope = payload.attributes?.["data-botflows-mapped"] || "global";
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

      messageQueueRef.current = [];
    }, 100); // Adjust interval if needed

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!rawMessages || rawMessages.length === 0) return;
    messageQueueRef.current.push(...rawMessages);
    setRawMessages([]); // still reset so dashboard can collect fresh ones
  }, [rawMessages]);

  const handleNavigate = async () => {
    if (!urlInput.trim()) return;
    await onEnsureWebSocket("event", isMounted);
    await onEnsureWebSocket("log", isMounted);

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

      const resAgent = await fetch(`${config.agentServerUrl}/api/stop`, {
        method: "POST",
        headers
      });
      if (!resAgent.ok) throw new Error("Failed to stop recording");

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
      await onEnsureWebSocket("event", isMounted);
      await onEnsureWebSocket("log", isMounted);

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

  // const fetchStatus = async () => {
  //   try {
  //     const res = await fetch(`${config.agentServerUrl}/api/status`);
  //     const data = await res.json();
  //     if (data.recording) setStatus("recording");
  //     else if (data.replaying) setStatus("replaying");
  //     else if (data.running) setStatus("idle");
  //     else setStatus("stopped");
  //   } catch {
  //     setStatus("unknown");
  //   }
  // };


  // useEffect(() => {
  //   fetchStatus();
  //   const interval = setInterval(fetchStatus, 5000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <section className="flex-1 bg-gray-50 p-4 h-full min-h-0 flex flex-col">
      {/* Top static inputs */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            className="border p-2 w-full rounded"
            placeholder="Enter URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button onClick={handleNavigate} className="bg-blue-600 text-white px-3 py-2 rounded">Record</button>
          <button onClick={() => setShowSavePopup(true)} className="bg-green-600 text-white px-3 py-2 rounded">Save</button>
          <button onClick={handlePreviewReplay} className="bg-purple-600 text-white px-3 py-2 rounded">Preview</button>
        </div>

        <div className="text-sm text-gray-500">Status: {status}</div>

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
