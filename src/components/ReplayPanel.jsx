import { useState, useEffect } from "react";
import config from "../config";
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";
import FlowSelector from "./FlowSelector";
import { getFlowExecutionStatus, listFlows, loadFlow, syncFlowIdMetadata } from "../utils/flowApi";
import { validateFlowSteps } from "../utils/flowSchema";

export default function ReplayPanel({
  onEnsureWebSocket,
  isMounted,
  agentStatus,
  logs,
  setLogs,
  rawMessages,
  setRawMessages,
}) {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [log, setLog] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const token = localStorage.getItem("botflows_token");
  const { userId } = useAuth();
  // OS Detection (macOS)
  const isMacOS = () => /Mac/i.test(navigator.platform || navigator.userAgent);
  const showMacWarning = isMacOS();

  useEffect(() => {
    if (!rawMessages || rawMessages.length === 0) return;

    rawMessages.forEach((raw) => {
      try {
        const channel = raw._channel; // passed from parent
        const payload = raw.payload || raw;

        if (["log", "event"].includes(channel) && ["ping", "ready"].includes(raw.type)) return;

        if (channel === "log" && raw.type === "log") {
          setLogs((prev) => [...prev, payload.message]);
          return;
        }
      } catch (err) {
        console.error("Failed to process raw message:", err);
      }
    });
    setRawMessages([]);
  }, [rawMessages]);

  useEffect(() => {
    const fetchSavedFlows = async () => {
      try {
        await onEnsureWebSocket("event", isMounted);
        await onEnsureWebSocket("log", isMounted);
        const data = await listFlows();
        setSavedFlows(data);
      } catch (err) {
        console.error("Error fetching saved flows", err);
        setLog("Failed to fetch saved flows");
      }
    };

    fetchSavedFlows();
  }, [token]);

  const handleReplay = async () => {
    if (!selectedFlow) return;
    setLogs([]);

    try {
      try {
        const status = await getFlowExecutionStatus(selectedFlow);
        if (status?.isExecutionEnabled === false) {
          setLog("Replay blocked: flow execution is disabled by admin policy.");
          return;
        }
      } catch (statusErr) {
        console.warn("Execution status precheck unavailable. Continuing replay.", statusErr);
      }

      const flowData = await loadFlow(selectedFlow);
      const validated = validateFlowSteps(flowData);
      if (validated.hasErrors) {
        setLog("Replay blocked: flow has validation errors. Open Create tab and fix highlighted steps.");
        return;
      }

      const selectedFlowMeta = savedFlows.find((f) => f.path === selectedFlow) || {};
      const res = await fetch(`${config.agentServerUrl}/api/replay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("botflows_token")?.startsWith("Bearer ")
            ? localStorage.getItem("botflows_token")
            : `Bearer ${localStorage.getItem("botflows_token") || ""}`,
          "x-api-key": `${config.apiKey}`,
        },
        body: JSON.stringify({
          steps: validated.steps,
          flowPath: selectedFlow,
          flowId: selectedFlowMeta.id || undefined,
          triggerType: "manual",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail || data?.error || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      setLog("Replay started:\n" + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Replay failed:", err);
      setLog("Replay failed: " + err.message);
    }
  };

  const handleDownload = async () => {
    if (!selectedFlow || isDownloading) return;
    setIsDownloading(true);
    try {
      const flowJson = await loadFlow(selectedFlow);
      const selectedFlowMeta = savedFlows.find((f) => f.path === selectedFlow) || {};
      const flowId = String(selectedFlowMeta.id || "");
      if (selectedFlow && flowId) {
        try {
          await syncFlowIdMetadata(selectedFlow, flowId);
        } catch (err) {
          console.warn("Flow ID metadata sync failed. Continuing download.", err);
        }
      }
      const flowDoc = {
        flowId,
        flowPath: selectedFlow || undefined,
        steps: flowJson,
      };

      // Derive a safe filename: last segment of path, ensure .json
      const base = (selectedFlow.split("/").pop() || "flow").replace(/[^\w.-]/g, "_");
      const filename = base.toLowerCase().endsWith(".json") ? base : `${base}.json`;

      const blob = new Blob([JSON.stringify(flowDoc, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLog(`Downloaded flow: ${filename}`);
    } catch (err) {
      console.error("Download failed:", err);
      setLog("Download failed: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative w-full h-full px-6 max-w-screen-lg mx-auto flex flex-col space-y-6">
      {/* macOS Warning Overlay */}
      {showMacWarning && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-50 flex items-center justify-center px-6">
          <div className="bg-red-100 border border-red-400 text-red-800 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg">macOS Not Supported (Yet)</p>
            <p className="text-sm mt-2">
              The Flowtra Agent currently works only on Windows. We're actively working on macOS compatibility. Please try again on a Windows machine to record and replay flows.
            </p>
          </div>
        </div>
      )}
      {/* Overlay */}
      {!showMacWarning && ["stopped", "unknown"].includes(agentStatus) && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent Required</p>
            <p className="text-sm mb-4">To start recording and replaying flows, please install and run the Flowtra Agent on your computer.</p>

            <button
              className="installAgent mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={() => {
                const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe";
                const link = document.createElement("a");
                link.href = url;
                link.download = "FlowtraAgentInstaller.exe";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download Flowtra Agent
            </button>

            <div className="p-3 bg-gray-50 border border-gray-300 text-sm text-gray-800 rounded">
              <strong>Note:</strong> This installer is not digitally signed yet.
              <br />If you see a SmartScreen warning in Windows:
              <ul className="list-disc list-inside mt-1 ml-4">
                <li>Click <em>"More info"</em></li>
                <li>Then click <em>"Run anyway"</em></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Heading */}
      <h2 className="text-xl font-semibold text-indigo-700">Replay Flow</h2>

      {/* Flow Selector */}
      <section className="bg-white shadow rounded-lg p-5 space-y-4">
        <FlowSelector
          value={selectedFlow}
          onChange={setSelectedFlow}
          label="Select Flow"
          fetchedFlows={savedFlows}
        />
        

        <div className="flex justify-end gap-2">
          <button
            onClick={handleDownload}
            disabled={!selectedFlow || isDownloading}
            className={`px-4 py-2 rounded shadow text-sm border ${
              !selectedFlow || isDownloading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
            title={!selectedFlow ? "Select a flow to download" : "Download flow JSON"}
          >
            {isDownloading ? "Downloading..." : "Download JSON"}
          </button>

          <button onClick={handleReplay} className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm">
            Replay
          </button>
        </div>
      </section>

      {/* Status Panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StatusPanel status={agentStatus} logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
