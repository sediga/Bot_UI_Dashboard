import { useState, useEffect, useRef } from "react";
import config from "../config";

export default function StepBuilder({
  addStep,
  currentLoopId,
  steps,
  clearSteps,
  updateStepWithImprovedSelector,
  setPickedTarget,
  setSteps,
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
  const token = localStorage.getItem("botflows_token");

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
    const fetchFlows = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-api-key": `${config.apiKey}` // Load from env later
        };
        const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) setAvailableFlows(data);
      } catch (err) {
        console.error("Failed to fetch flow list", err);
      }
    };

    fetchFlows();
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`${config.agentServerUrl}/ws/actions`);

    ws.onopen = () => console.log("WebSocket connected");
    ws.onerror = (err) => console.error("WebSocket error", err);
    ws.onclose = () => console.warn("⚠️ WebSocket closed");

    ws.onmessage = async (event) => {
      try {
        const raw = JSON.parse(event.data);

        if (raw.type === "targetPicked") {
          setPickedTarget(raw);
          return;
        }

        const isSmartColumnClick = raw.type === "clickInColumn";

        const step = {
          id: crypto.randomUUID(),
          type: "uiAction",
          action: raw.action,
          value: raw.value || null,
          url: raw.url || null,
          timestamp: raw.timestamp || Date.now(),
          label: getStepLabel(raw),
          selector: raw.selector,
          selectors: raw.selectors,
          improvedSelector: raw.improvedSelector,
          devToolsSelector: raw.devToolsSelector,
          tagName: raw.tagName,
          attributes: raw.attributes || {},
          innerText: raw.innerText,
          elementText: raw.elementText,
          classList: raw.classList || [],
          boundingBox: raw.boundingBox,
        };

        if (currentLoopId) {
          step.parentId = currentLoopId;

          // Handle smart column action mapping
          if (isSmartColumnClick) {
            step.columnIndex = raw.columnIndex;
            step.columnHeader = raw.columnHeader;
            step.isSmartColumn = true;
            step.smartActionType = raw.actionType || "click";
          }

          // Handle dynamic mapping fields
          if (["change", "type", "select", "click"].includes(raw.action)) {
            const dynamicVal = raw.attributes?.["data-dynamic-value"];
            if (dynamicVal && dynamicVal.startsWith("{{") && dynamicVal.endsWith("}}")) {
              step.dynamicValue = dynamicVal;
              step.isDynamic = true;
              step.transformType = raw.attributes?.["data-transform-type"] || null;
              step.transform = raw.attributes?.["data-transform"] || null;
              step.mappedScope = raw.attributes?.["data-botflows-mapped"] || "global";
            }
          }
        }

        setSteps(prev => [...prev, step]);

        // Retry label update if needed
        try {
          if (!step.label || step.label.includes("Unknown")) {
            const updatedLabel = getStepLabel(raw);
            step.label = updatedLabel;
            updateStepWithImprovedSelector(step.id, { label: updatedLabel });
          }
        } catch (err) {
          console.warn("Failed to update label:", err);
        }

      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    return () => ws.close();
  }, [addStep, updateStepWithImprovedSelector, setSteps, currentLoopId]);

  const handleNavigate = async () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const formattedUrl = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    setUrlInput(formattedUrl);

    try {
      clearSteps();
      const res = await fetch(`${config.agentServerUrl}/api/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Failed to start recording");

      const navigateStep = {
        id: crypto.randomUUID(),
        type: "navigate",
        url,
      };
      addStep(navigateStep);
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
      const res = await fetch(`${config.agentServerUrl}/api/preview-replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(steps),
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

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${config.agentServerUrl}/api/status`);
      const data = await res.json();
      if (data.recording) setStatus("recording");
      else if (data.replaying) setStatus("replaying");
      else if (data.running) setStatus("idle");
      else setStatus("stopped");
    } catch {
      setStatus("unknown");
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          className="border p-2 w-full rounded"
          placeholder="Enter URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button
          onClick={handleNavigate}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Record
        </button>
        <button
          onClick={() => setShowSavePopup(true)}
          className="bg-green-600 text-white px-3 py-2 rounded"
        >
          Save
        </button>
        <button
          onClick={handlePreviewReplay}
          className="bg-purple-600 text-white px-3 py-2 rounded"
          disabled={status !== "recording"}
        >
          Preview
        </button>
      </div>

      <div className="text-sm text-gray-500">Status: {status}</div>

      <div className="border-t pt-4">
        <label className="block mb-1 font-medium">Load Flow:</label>
        <select
          className="border rounded p-2 w-full"
          value={selectedFlow}
          onChange={(e) => {
            setSelectedFlow(e.target.value);
            loadFlow(e.target.value);
          }}
        >
          <option value="">-- Choose saved flow --</option>
          {availableFlows.map((flow) => (
            <option key={flow.path} value={flow.path}>
              {flow.name}
            </option>
          ))}
        </select>
      </div>

      {showSavePopup && (
        <div className="bg-white shadow rounded p-4 space-y-2 border">
          <label className="block font-medium">Save As:</label>
          <input
            type="text"
            className="border p-2 w-full rounded"
            value={saveFileName}
            onChange={(e) => setSaveFileName(e.target.value)}
            placeholder="flow_name"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-1 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setShowSavePopup(false)}
              className="bg-gray-400 text-white px-4 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
