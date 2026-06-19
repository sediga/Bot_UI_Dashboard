import { useEffect, useRef, useState } from "react";
import FlowSelector from "./FlowSelector";
import StatusPanel from "./StatusPanel";
import { listFlows, loadDocument, saveDocument } from "../utils/flowApi";
import {
  createEmptyWorkflowDocument,
  detectDocumentKind,
  validateWorkflowDocument,
} from "../utils/flowSchema";

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function sanitizeFilename(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

function inferFilename(workflowDocument, workflowMeta) {
  const fromPath = String(workflowMeta?.flowPath || "")
    .split("/")
    .pop()
    ?.replace(/\.json$/i, "");
  return sanitizeFilename(workflowDocument?.name || fromPath || "workflow");
}

export default function WorkflowBuilder({
  workflowDocument,
  setWorkflowDocument,
  workflowMeta,
  setWorkflowMeta,
  agentStatus,
  logs,
  setLogs,
}) {
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [selectedWorkflowPath, setSelectedWorkflowPath] = useState(workflowMeta?.flowPath || "");
  const [isFetching, setIsFetching] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [saveFileName, setSaveFileName] = useState(inferFilename(workflowDocument, workflowMeta));
  const [validationSummary, setValidationSummary] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setSelectedWorkflowPath(workflowMeta?.flowPath || "");
  }, [workflowMeta?.flowPath]);

  useEffect(() => {
    setSaveFileName(inferFilename(workflowDocument, workflowMeta));
  }, [workflowDocument?.name, workflowMeta?.flowPath]);

  const fetchWorkflows = async () => {
    setIsFetching(true);
    try {
      const data = await listFlows();
      setAvailableWorkflows(Array.isArray(data) ? data.filter((item) => item.type === "workflow") : []);
    } catch (err) {
      console.error("Failed to load workflows:", err);
      setAvailableWorkflows([]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const applyWorkflowDocument = (document, meta = {}) => {
    const kind = detectDocumentKind(document);
    if (kind !== "workflow") {
      throw new Error("Expected a workflow document.");
    }
    const issues = validateWorkflowDocument(document);
    setWorkflowDocument(document);
    setWorkflowMeta({
      flowId: String(meta.flowId || document.id || ""),
      flowPath: String(meta.flowPath || ""),
    });
    setValidationSummary(issues.length ? "Workflow has validation issues. Review the nodes on the right." : "");
  };

  const handleCreateNew = () => {
    applyWorkflowDocument(createEmptyWorkflowDocument(), { flowId: "", flowPath: "" });
    setSelectedWorkflowPath("");
  };

  const handleSelectWorkflow = async (path) => {
    setSelectedWorkflowPath(path);
    if (!path) return;
    try {
      const document = await loadDocument(path, { materialize: false });
      const selectedMeta = availableWorkflows.find((item) => item.path === path) || {};
      applyWorkflowDocument(document, {
        flowId: selectedMeta.id || document.id || "",
        flowPath: path,
      });
    } catch (err) {
      console.error("Failed to load workflow:", err);
      alert(err?.message || "Could not load workflow.");
    }
  };

  const handleImportFile = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyWorkflowDocument(parsed, { flowId: parsed?.id || "", flowPath: "" });
      setSelectedWorkflowPath("");
    } catch (err) {
      console.error("Failed to import workflow:", err);
      alert(err?.message || "Could not import workflow JSON.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExport = () => {
    if (!workflowDocument) return;
    const filenameBase = inferFilename(workflowDocument, workflowMeta) || "workflow";
    const filename = filenameBase.toLowerCase().endsWith(".json") ? filenameBase : `${filenameBase}.json`;
    const blob = new Blob([JSON.stringify(workflowDocument, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!workflowDocument) return;
    const issues = validateWorkflowDocument(workflowDocument);
    if (issues.length) {
      setValidationSummary("Fix workflow validation issues before saving.");
      alert(`Cannot save workflow:\n${issues.join("\n")}`);
      return;
    }

    const filename = sanitizeFilename(saveFileName || workflowDocument.name || workflowDocument.id || "workflow");
    if (!filename) {
      alert("Please enter a workflow file name.");
      return;
    }

    try {
      const result = await saveDocument(filename, workflowDocument);
      await fetchWorkflows();
      const refreshed = await listFlows();
      const workflows = Array.isArray(refreshed) ? refreshed.filter((item) => item.type === "workflow") : [];
      setAvailableWorkflows(workflows);
      const matched = workflows.find((item) => item.id === result?.flowId) || workflows.find((item) => item.name === workflowDocument.name);
      if (matched) {
        setSelectedWorkflowPath(matched.path);
        setWorkflowMeta({
          flowId: String(matched.id || result?.flowId || workflowDocument.id || ""),
          flowPath: String(matched.path || ""),
        });
      }
      setValidationSummary("");
      alert(result?.message || "Workflow saved.");
    } catch (err) {
      console.error("Failed to save workflow:", err);
      alert(err?.message || "Error saving workflow.");
    } finally {
      setShowSavePopup(false);
    }
  };

  const updateTopLevel = (patch) => {
    setWorkflowDocument((prev) => ({ ...(prev || createEmptyWorkflowDocument()), ...patch }));
  };

  return (
    <section className="flex-1 bg-gray-50 p-4 h-full min-h-0 flex flex-col">
      <div className="space-y-4">
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          Workflow mode edits declarative workflow documents with <code>nodes[]</code>. Recording and browser step capture still stay in the plain Flow editor.
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
            type="button"
          >
            New Workflow
          </button>
          <button
            onClick={() => setShowSavePopup(true)}
            className="px-4 py-2 rounded bg-emerald-600 text-white"
            type="button"
            disabled={!workflowDocument}
          >
            Save Workflow
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded bg-gray-800 text-white"
            type="button"
          >
            Import JSON
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-800"
            type="button"
            disabled={!workflowDocument}
          >
            Export JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <FlowSelector
          value={selectedWorkflowPath}
          onChange={handleSelectWorkflow}
          label="Select Workflow"
          fetchedFlows={availableWorkflows}
          allowedTypes={["workflow"]}
          placeholder="-- Choose saved workflow --"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {isFetching
              ? "Refreshing workflows..."
              : (availableWorkflows.length ? `${availableWorkflows.length} saved workflows` : "No saved workflows found")}
          </span>
          <button
            onClick={fetchWorkflows}
            className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-100"
            disabled={isFetching}
            type="button"
          >
            Refresh
          </button>
        </div>

        {workflowDocument && (
          <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Workflow Name</label>
                <input
                  type="text"
                  className="w-full rounded border p-2 text-sm"
                  value={workflowDocument.name || ""}
                  onChange={(e) => updateTopLevel({ name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Workflow Id</label>
                <input
                  type="text"
                  className="w-full rounded border p-2 text-sm"
                  value={workflowDocument.id || ""}
                  onChange={(e) => updateTopLevel({ id: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Version</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded border p-2 text-sm"
                    value={workflowDocument.version ?? 1}
                    onChange={(e) => updateTopLevel({ version: Number(e.target.value || 1) })}
                  />
                </div>
                <label className="flex items-center gap-2 pt-7 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={workflowDocument.enabled !== false}
                    onChange={(e) => updateTopLevel({ enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Node Id</label>
                <input
                  type="text"
                  className="w-full rounded border p-2 text-sm"
                  value={workflowDocument.startNodeId || ""}
                  onChange={(e) => updateTopLevel({ startNodeId: e.target.value })}
                  list="workflow-start-node-options"
                />
                <datalist id="workflow-start-node-options">
                  {(workflowDocument.nodes || []).map((node) => (
                    <option key={node.id || node.name} value={node.id || ""}>
                      {node.name || node.id}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Context JSON</label>
                <textarea
                  key={`workflow-context-${safeStringify(workflowDocument.context)}`}
                  defaultValue={safeStringify(workflowDocument.context)}
                  className="min-h-[110px] w-full rounded border p-2 font-mono text-xs"
                  onBlur={(e) => {
                    try {
                      updateTopLevel({ context: JSON.parse(e.target.value || "{}") });
                    } catch {
                      alert("Context JSON is invalid.");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {validationSummary && (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {validationSummary}
          </div>
        )}
      </div>

      {showSavePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-full max-w-sm rounded border bg-white p-4 shadow">
            <label className="block font-medium">Save Workflow As:</label>
            <input
              type="text"
              className="mt-2 w-full rounded border p-2"
              value={saveFileName}
              onChange={(e) => setSaveFileName(e.target.value)}
              placeholder="workflow_name"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={handleSave} className="rounded bg-green-600 px-4 py-1 text-white">Save</button>
              <button onClick={() => setShowSavePopup(false)} className="rounded bg-gray-400 px-4 py-1 text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <StatusPanel status={agentStatus} logs={logs} onClear={() => setLogs([])} />
      </div>
    </section>
  );
}
