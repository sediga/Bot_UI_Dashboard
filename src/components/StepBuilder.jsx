import { useState, useEffect, useRef } from "react";
import config from "../config";

export default function StepBuilder({ addStep, currentLoopId, steps, clearSteps, updateStepWithImprovedSelector, setPickedTarget, setSteps }) {
  const [status, setStatus] = useState("idle");
  const [urlInput, setUrlInput] = useState("");
  const [loopName, setLoopName] = useState("");
  const [saveFileName, setSaveFileName] = useState("");
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [loopType, setLoopType] = useState("counter");
  const [loopCount, setLoopCount] = useState(1);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");

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
          "Content-Type": "application/json",
          "x-api-key": `${config.apiKey}`
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

        const step = {
          id: crypto.randomUUID(),
          type: "uiAction",
          action: raw.action,
          selector: raw.improvedSelector || raw.selector,
          value: raw.value || null,
          url: raw.url || null,
          timestamp: raw.timestamp || Date.now(),
          label: getStepLabel(raw),
        };

        const loopId = currentLoopId;
        if (loopId) {
          setSteps(prev => {
            return prev.map(s => {
              if (s.id === loopId) {
                const existing = s.actionsPerRow || [];
                return { ...s, actionsPerRow: [...existing, step] };
              }
              return s;
            });
          });
        } else {
          addStep(step);
        }

        try {
          const headers = {
            "Content-Type": "application/json",
            "x-api-key": `${config.apiKey}`,
          };
          const res = await fetch(`${config.apiBaseUrl}/api/Selector/improve-selector`, {
            method: "POST",
            headers,
            body: JSON.stringify(raw),
          });
          const enriched = await res.json();

          step.improvedSelector = enriched.bestSelector;
          step.score = enriched.score;
          step.reason = enriched.reason;

          if (!step.label || step.label.includes("Unknown")) {
            step.label = getStepLabel({ ...raw, ...enriched });
          }

          updateStepWithImprovedSelector(step.id, {
            improvedSelector: enriched.bestSelector,
            score: enriched.score,
            reason: enriched.reason,
            label: step.label,
          });
        } catch (err) {
          console.warn("⚠️ Selector enrichment failed:", err);
        }
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    return () => ws.close();
  }, [addStep, updateStepWithImprovedSelector, setSteps]);

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

  const handleStopLoop = () => {
  };

  const handleSave = async () => {
    if (!saveFileName.trim()) return;
    const cleanName = saveFileName.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    try {
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey}`
      };
      const res = await fetch(`${config.apiBaseUrl}/api/flows/save`, {
        method: "POST",
        headers,
        body: JSON.stringify({ filename: cleanName, steps }),
      });

      const data = await res.json();
      alert(data.message || "Flow saved.");
      setUrlInput("");
      clearSteps();
    } catch (err) {
      console.error("Failed to save flow:", err);
      alert("Error saving flow");
    }

    setShowSavePopup(false);
    setSaveFileName("");
  };

  const loadFlow = async (selectedFlow) => {
    if (!selectedFlow) return;
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey}`
      };
      const res = await fetch(`${config.apiBaseUrl}/api/flows/load/${selectedFlow}`, { headers });
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
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-indigo-700">Flow Builder</h2>

      <div className="text-sm text-gray-600">
        Agent Status: <span className="font-medium">{status}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Navigate to URL</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button onClick={handleNavigate} className="px-4 py-2 bg-indigo-600 text-white rounded shadow text-sm">
            Go
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Add Data-Driven Step</label>
        <div className="flex flex-col gap-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={loopName}
              onChange={(e) => setLoopName(e.target.value)}
              placeholder="Step name (e.g. patients)"
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <select
              className="px-2 py-2 border rounded text-sm"
              value={loopType}
              onChange={(e) => setLoopType(e.target.value)}
            >
              <option value="counter">Counter</option>
              <option value="rows">Rows</option>
              <option value="api">API</option>
            </select>
          </div>

          {loopType === "counter" && (
            <input
              type="number"
              min={1}
              value={loopCount}
              onChange={(e) => setLoopCount(parseInt(e.target.value))}
              className="w-32 px-3 py-2 border rounded text-sm"
              placeholder="Loop count"
            />
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleStartLoop}
              className="px-4 py-2 bg-yellow-600 text-white rounded shadow text-sm"
            >
              Add Step
            </button>
            <button
              onClick={handleStopLoop}
              className="px-4 py-2 bg-gray-500 text-white rounded shadow text-sm"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button onClick={() => setShowSavePopup(true)} className="px-6 py-2 bg-green-600 text-white rounded text-sm shadow">
          Save Flow
        </button>
      </div>

      <div className="space-y-2 pt-4">
        <label className="text-sm font-medium text-gray-700">Load Existing Flow</label>
        <div className="flex space-x-2">
          <select
            value={selectedFlow}
            onChange={(e) => setSelectedFlow(e.target.value)}
            className="flex-1 px-3 py-2 border rounded text-sm"
          >
            <option value="">-- Select Flow --</option>
            {availableFlows.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={async () => await loadFlow(selectedFlow)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm shadow"
          >
            Load
          </button>
        </div>
      </div>

      {showSavePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow space-y-4 w-96">
            <h3 className="text-lg font-semibold text-gray-800">Save Flow As</h3>
            <input
              type="text"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder="flow-name"
              className="w-full px-3 py-2 border rounded text-sm"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowSavePopup(false)} className="px-4 py-2 text-sm rounded bg-gray-300">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm rounded bg-indigo-600 text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
