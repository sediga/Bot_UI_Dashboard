import { useEffect, useRef, useState } from "react";
import config from "../config";
import StatusPanel from "./StatusPanel";
import FlowSelector from "./FlowSelector";
import { getFlowExecutionStatus, listFlows, loadDocument, syncFlowIdMetadata } from "../utils/flowApi";
import { detectDocumentKind, documentKindLabel, validateReplayDocument } from "../utils/flowSchema";

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
  const [localDocument, setLocalDocument] = useState(null);
  const [localDocumentMeta, setLocalDocumentMeta] = useState(null);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("botflows_token");
  // OS Detection (macOS)
  const isMacOS = () => /Mac/i.test(navigator.platform || navigator.userAgent);
  const showMacWarning = isMacOS();
  const selectedFlowMeta = savedFlows.find((item) => item.path === selectedFlow) || null;
  const selectedDocumentKind = selectedFlowMeta?.type || "flow";
  const flowCount = savedFlows.filter((item) => item.type !== "workflow").length;
  const workflowCount = savedFlows.filter((item) => item.type === "workflow").length;
  const activeDocumentMeta = localDocumentMeta || selectedFlowMeta;
  const activeDocumentKind = localDocumentMeta?.kind || selectedDocumentKind;

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

  const resetLocalDocument = () => {
    setLocalDocument(null);
    setLocalDocumentMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadLocalFile = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = JSON.parse(text);
      const kind = detectDocumentKind(parsed);
      if (kind === "unknown") {
        throw new Error("Unsupported document shape. Expected a flow or workflow JSON document.");
      }
      setSelectedFlow("");
      setLocalDocument(parsed);
      setLocalDocumentMeta({
        name: file.name,
        kind,
        source: "local",
      });
      setLog(`Loaded local ${documentKindLabel(kind).toLowerCase()}: ${file.name}`);
    } catch (err) {
      console.error("Failed to load local replay document:", err);
      setLog("Could not load local JSON: " + (err?.message || "unknown error"));
      alert(err?.message || "Could not load local JSON.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReplay = async () => {
    if (!selectedFlow && !localDocument) return;
    setLogs([]);

    try {
      let documentData = localDocument;
      let replayFlowPath = undefined;
      let replayFlowId = undefined;

      if (!documentData) {
        try {
          const status = await getFlowExecutionStatus(selectedFlow);
          if (status?.isExecutionEnabled === false) {
            setLog(`Replay blocked: ${status?.disableReason || "flow execution is disabled by admin policy."}`);
            return;
          }
        } catch (statusErr) {
          console.warn("Execution status precheck unavailable. Continuing replay.", statusErr);
        }

        documentData = await loadDocument(selectedFlow, {
          materialize: selectedDocumentKind === "workflow",
        });
        replayFlowPath = selectedFlow;
        replayFlowId = selectedFlowMeta?.id || undefined;
      }

      const validated = validateReplayDocument(documentData);
      if (validated.hasErrors) {
        const issues = validated.issues?.length ? `\n${validated.issues.join("\n")}` : "";
        setLog(`Replay blocked: ${documentKindLabel(validated.kind).toLowerCase()} has validation issues.${issues}`);
        return;
      }

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
          document: validated.document,
          flowPath: replayFlowPath,
          flowId: replayFlowId,
          triggerType: "manual",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail || data?.error || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      setLog(`${documentKindLabel(validated.kind)} replay started:\n` + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Replay failed:", err);
      setLog("Replay failed: " + err.message);
    }
  };

  const handleDownload = async () => {
    if (!selectedFlow || isDownloading) return;
    setIsDownloading(true);
    try {
      const document = await loadDocument(selectedFlow);
      const kind = detectDocumentKind(document);
      const flowId = String(selectedFlowMeta?.id || "");
      if (selectedFlow && flowId && kind === "flow") {
        try {
          await syncFlowIdMetadata(selectedFlow, flowId);
        } catch (err) {
          console.warn("Flow ID metadata sync failed. Continuing download.", err);
        }
      }
      const flowDoc = {
        flowId,
        flowPath: selectedFlow || undefined,
        document,
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

      setLog(`Downloaded ${documentKindLabel(kind).toLowerCase()}: ${filename}`);
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
      <h2 className="text-xl font-semibold text-indigo-700">Replay Flow Or Workflow</h2>

      {/* Flow Selector */}
      <section className="bg-white shadow rounded-lg p-5 space-y-4">
        <FlowSelector
          value={selectedFlow}
          onChange={(value) => {
            resetLocalDocument();
            setSelectedFlow(value);
          }}
          label="Select Document"
          fetchedFlows={savedFlows}
          placeholder="-- Choose saved flow or workflow --"
        />

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{flowCount} flows | {workflowCount} workflows</span>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded shadow text-sm border bg-white text-gray-800 hover:bg-gray-50"
            type="button"
          >
            Load Local JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleLoadLocalFile}
          />
          {localDocument && (
            <button
              onClick={resetLocalDocument}
              className="px-4 py-2 rounded shadow text-sm border bg-white text-gray-800 hover:bg-gray-50"
              type="button"
            >
              Clear Local
            </button>
          )}
        </div>

        {activeDocumentMeta && (
          <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{activeDocumentMeta.name}</div>
            <div className="mt-1 text-xs text-slate-600">
              {documentKindLabel(activeDocumentKind)}
              {activeDocumentMeta.version != null && activeDocumentMeta.version !== "" ? ` | v${activeDocumentMeta.version}` : ""}
              {activeDocumentMeta.path ? ` | ${activeDocumentMeta.path}` : ""}
              {localDocumentMeta ? " | local file" : ""}
            </div>
            {activeDocumentKind === "workflow" && (
              <div className="mt-2 text-xs text-slate-600">
                {localDocumentMeta
                  ? "Local workflows can replay only if they already contain resolvedFlow. Saved workflows loaded from the server are materialized automatically."
                  : "Workflow replay uses API materialization so referenced child flows are stitched into the payload before the agent runs it."}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={handleDownload}
            disabled={!selectedFlow || isDownloading}
            className={`px-4 py-2 rounded shadow text-sm border ${
              !selectedFlow || isDownloading
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
            title={!selectedFlow ? "Select a flow or workflow to download" : "Download document JSON"}
          >
            {isDownloading ? "Downloading..." : "Download JSON"}
          </button>

          <button onClick={handleReplay} className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm">
            Replay Document
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
