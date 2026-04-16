import { useEffect, useMemo, useState } from "react";
import Modal from "./SmartStepModal";
import { listFlows } from "../utils/flowApi";
import { validateWorkflowDocument } from "../utils/flowSchema";
import {
  normalizeWorkflowNode,
  summarizeWorkflowNode,
  workflowNodeConnections,
  workflowNodeMeta,
} from "../utils/workflowNodes";
import WorkflowNodeWizard from "./workflownodes/WorkflowNodeWizard";
import WorkflowNodeEditModal from "./workflownodes/WorkflowNodeEditModal";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function WorkflowNodeList({ workflowDocument, setWorkflowDocument }) {
  const [showNodeWizard, setShowNodeWizard] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    const fetchFlows = async () => {
      try {
        const data = await listFlows();
        if (!mounted) return;
        setAvailableFlows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load flow options for workflow nodes:", err);
        if (mounted) setAvailableFlows([]);
      }
    };

    fetchFlows();
    return () => {
      mounted = false;
    };
  }, []);

  const normalizedNodes = useMemo(
    () => (Array.isArray(workflowDocument?.nodes) ? workflowDocument.nodes.map((node, index) => normalizeWorkflowNode(node, index)) : []),
    [workflowDocument]
  );

  const availableNodes = useMemo(
    () =>
      normalizedNodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
      })),
    [normalizedNodes]
  );

  const validationIssues = useMemo(
    () => (workflowDocument ? validateWorkflowDocument(workflowDocument) : []),
    [workflowDocument]
  );

  const filteredNodes = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return normalizedNodes.filter((node) => {
      if (typeFilter !== "all" && String(node.type || "") !== typeFilter) return false;
      if (!needle) return true;
      const haystack = [
        node.id,
        node.name,
        node.type,
        summarizeWorkflowNode(node),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [normalizedNodes, searchText, typeFilter]);

  const updateWorkflow = (updater) => {
    setWorkflowDocument((prev) => {
      const next = clone(prev || {});
      return typeof updater === "function" ? updater(next) : updater;
    });
  };

  const handleCreateNode = (node) => {
    updateWorkflow((draft) => {
      draft.nodes = Array.isArray(draft.nodes) ? draft.nodes : [];
      draft.nodes.push(node);
      if (!draft.startNodeId) draft.startNodeId = node.id;
      return draft;
    });
    setShowNodeWizard(false);
  };

  const handleSaveNode = (updatedNode) => {
    const originalNodeId = editingNodeId || updatedNode.id;
    updateWorkflow((draft) => {
      draft.nodes = (draft.nodes || []).map((item) => {
        if (String(item.id || "") === String(originalNodeId || "")) {
          return updatedNode;
        }

        const nextItem = clone(item);
        if (Array.isArray(nextItem.routes)) {
          nextItem.routes = nextItem.routes.map((route) =>
            String(route?.targetId || "") === String(originalNodeId || "")
              ? { ...route, targetId: updatedNode.id }
              : route
          );
        }

        if (Array.isArray(nextItem.switch?.cases)) {
          nextItem.switch = {
            ...nextItem.switch,
            cases: nextItem.switch.cases.map((workflowCase) =>
              String(workflowCase?.targetId || "") === String(originalNodeId || "")
                ? { ...workflowCase, targetId: updatedNode.id }
                : workflowCase
            ),
          };
        }

        return nextItem;
      });

      if (!draft.startNodeId || draft.startNodeId === originalNodeId) {
        draft.startNodeId = updatedNode.id;
      }
      return draft;
    });
    setEditingNodeId(null);
  };

  const handleDeleteNode = (nodeId) => {
    const ok = window.confirm("Delete this workflow node?");
    if (!ok) return;

    updateWorkflow((draft) => {
      draft.nodes = (draft.nodes || []).filter((item) => String(item.id || "") !== String(nodeId || ""));
      if (draft.startNodeId === nodeId) {
        draft.startNodeId = draft.nodes?.[0]?.id || "";
      }
      return draft;
    });
  };

  if (!workflowDocument) {
    return (
      <section className="h-full bg-gray-50 p-4">
        <div className="rounded border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          Create or load a workflow on the left to start editing nodes.
        </div>
      </section>
    );
  }

  const editingNode = normalizedNodes.find((node) => node.id === editingNodeId) || null;

  return (
    <section className="flex h-full flex-col bg-white p-4">
      <div className="flex-1 overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Workflow Nodes</h2>

        {validationIssues.length ? (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <div className="font-medium">Workflow validation issues</div>
            <ul className="mt-2 list-disc pl-5">
              {validationIssues.map((issue, index) => (
                <li key={`${issue}_${index}`}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <input
            className="rounded border px-2 py-1 text-xs"
            placeholder="Search nodes, ids, summaries..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <select
            className="rounded border px-2 py-1 text-xs"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All node types</option>
            <option value="runFlow">Run Flow</option>
            <option value="switchValue">Switch Value</option>
            <option value="delay">Delay</option>
            <option value="waitForEvent">Wait For Event</option>
            <option value="humanReview">Human Review</option>
            <option value="end">End</option>
          </select>
        </div>

        {!filteredNodes.length ? (
          <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
            {normalizedNodes.length
              ? "No nodes match the current filters."
              : "This workflow has no nodes yet. Add one to get started."}
          </div>
        ) : null}

        <ul className="space-y-3">
          {filteredNodes.map((node) => {
            const meta = workflowNodeMeta(node.type);
            const connections = workflowNodeConnections(node);
            const isStart = workflowDocument.startNodeId === node.id;

            return (
              <li key={node.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>
                        {meta.title}
                      </span>
                      {isStart ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Start Node
                        </span>
                      ) : null}
                      {node.enabled === false ? (
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                          Disabled
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="font-semibold text-gray-900">{node.name || node.id}</div>
                      <div className="text-xs text-gray-500">
                        <strong>ID:</strong> <code>{node.id}</code>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">{summarizeWorkflowNode(node)}</div>

                    {connections.length ? (
                      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                        <div className="mb-1 font-semibold text-gray-600">Connections</div>
                        <div className="flex flex-wrap gap-2">
                          {connections.map((connection) => (
                            <span key={connection.key} className="rounded border border-gray-200 bg-white px-2 py-1">
                              {connection.label}: <code>{connection.targetId || "(pending)"}</code>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <button onClick={() => setEditingNodeId(node.id)} className="text-blue-600 hover:text-blue-800">
                      Edit
                    </button>
                    {!isStart ? (
                      <button
                        onClick={() => setWorkflowDocument((prev) => ({ ...prev, startNodeId: node.id }))}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        Set As Start
                      </button>
                    ) : null}
                    <button onClick={() => handleDeleteNode(node.id)} className="text-red-600 hover:text-red-800">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t pt-4">
          <h3 className="mb-2 text-md font-semibold">Insert Workflow Node</h3>
          <button
            onClick={() => setShowNodeWizard(true)}
            className="rounded bg-blue-600 px-3 py-1 text-white"
          >
            Add Workflow Node
          </button>
        </div>

        {showNodeWizard ? (
          <Modal onClose={() => setShowNodeWizard(false)}>
            <WorkflowNodeWizard
              availableFlows={availableFlows}
              availableNodes={availableNodes}
              onCreate={handleCreateNode}
              onCancel={() => setShowNodeWizard(false)}
            />
          </Modal>
        ) : null}

        {editingNode ? (
          <WorkflowNodeEditModal
            node={editingNode}
            availableFlows={availableFlows}
            availableNodes={availableNodes}
            onClose={() => setEditingNodeId(null)}
            onSave={handleSaveNode}
          />
        ) : null}
      </div>
    </section>
  );
}
