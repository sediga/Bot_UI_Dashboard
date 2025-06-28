// StepList.jsx
import { useEffect, useState, useRef } from "react";
import SmartStepWizard from "./SmartStepWizard";
import Modal from "./SmartStepModal";
import config from "../config";

export default function StepList({
  steps,
  setSteps,
  pickedTarget,
  setPickedTarget,
  agentStatus,
  setCurrentLoopId,
}) {
  const [expandedSteps, setExpandedSteps] = useState({});
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [activeLoopId, setActiveLoopId] = useState(null);
  const [finalizedLoops, setFinalizedLoops] = useState(new Set());
  const scrollRef = useRef(null);

  useEffect(() => {
    const initialExpanded = {};
    steps.forEach((step, index) => {
      if (["dataLoop", "counterloop", "loop"].includes(step.type)) {
        initialExpanded[step.id] = true;
      }
    });
    setExpandedSteps(initialExpanded);
  }, [steps]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps]);

  const toggleExpand = (id) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const deleteStep = (stepId) => {
    const updated = steps.filter((s) => s.id !== stepId && s.parentId !== stepId);
    setSteps(updated);
  };

  const deleteSubStep = (step) => {
    const parentId = step.parentId;
    const siblings = steps.filter((s) => s.parentId === parentId && s.id !== step.id);
    const parentIsFinalized = finalizedLoops.has(parentId);

    if (siblings.length === 0 && parentIsFinalized) {
      const confirmDelete = window.confirm(
        "This is the last step in the loop and the loop is finalized. Delete the entire loop?"
      );
      if (!confirmDelete) return;

      const updated = steps.filter((s) => s.id !== step.id && s.id !== parentId);
      setSteps(updated);
    } else {
      const updated = steps.filter((s) => s.id !== step.id);
      setSteps(updated);
    }
  };

  const handleSmartStepCreated = async (step) => {
    setSteps((prev) => [...prev, step]);
    setPickedTarget(null);
    setShowSmartWizard(false);

    if (["loop", "dataLoop", "counterloop"].includes(step.type)) {
      await startLoopRecording(step);
    }
  };

  const handleCancelWizard = () => {
    setPickedTarget(null);
    setShowSmartWizard(false);
    fetch(`${config.agentServerUrl}/api/target-pick-done`, {
      method: "POST",
    }).catch((err) => console.error("Failed to notify agent on cancel:", err));
  };

  const extractSteps = steps.filter((step) => step.type === "gridExtract");
  const canAddSmartStep =
    agentStatus === "recording" && !showSmartWizard && activeLoopId === null;

  const startLoopRecording = async (step) => {
    try {
      await fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loopName: step.name }),
      });
      setActiveLoopId(step.id);
      setCurrentLoopId(step.id);
    } catch (err) {
      console.error("Failed to start loop recording", err);
    }
  };

  const stopLoopRecording = async () => {
    const hasSteps = steps.some((s) => s.parentId === activeLoopId);

    if (!hasSteps) {
      const confirmDelete = window.confirm(
        "This loop has no recorded steps. It will be deleted. Proceed?"
      );
      if (!confirmDelete) return;

      const updatedSteps = steps.filter(
        (s) => s.id !== activeLoopId && s.parentId !== activeLoopId
      );
      setSteps(updatedSteps);
    } else {
      setFinalizedLoops((prev) => new Set(prev).add(activeLoopId));
    }

    try {
      await fetch(`${config.agentServerUrl}/api/end-loop-recording`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to end loop recording", err);
    }

    setActiveLoopId(null);
    setCurrentLoopId(null);
  };

  const renderStep = (step, level = 0) => {
    const indent = `ml-${level * 4}`;
    const hasChildren = steps.some((s) => s.parentId === step.id);
    const isRecording = activeLoopId === step.id;
    const isFinalized = finalizedLoops.has(step.id);

    return (
      <li
        key={step.id}
        className={`bg-slate-100 p-3 rounded shadow flex justify-between items-start ${indent}`}
      >
        <div className="flex-1 pr-2 space-y-1">
          {step.type === "navigate" && (
            <div>
              <span className="font-medium text-indigo-600">Navigate:</span>{" "}
              <span className="text-gray-700">{step.url}</span>
            </div>
          )}

          {step.type === "uiAction" && (
            <div>
              <span className="font-medium text-purple-600">{step.action}</span>{" "}
              →{" "}
              <span className="text-slate-700">
                {step.label || (
                  <span className="text-gray-400 italic">No label</span>
                )}
              </span>
              {step.value && (
                <span className="text-green-600 ml-1">= "{step.value}"</span>
              )}
            </div>
          )}

          {(step.type === "loop" ||
            step.type === "counterloop" ||
            step.type === "dataLoop") && (
            <div className="flex items-start space-x-2">
              <button
                onClick={() => toggleExpand(step.id)}
                className="text-xs text-blue-600 mt-1"
              >
                {expandedSteps[step.id] ? "[−]" : "[+]"}
              </button>
              <div className="flex-1">
                <div className="font-semibold text-orange-600">
                  {step.name || `Loop (${step.source || step.id})`}
                </div>

                {isRecording && (
                  <div className="text-xs text-green-700 font-medium">
                    🎤 Recording steps inside this loop…
                  </div>
                )}
                {isFinalized && !isRecording && (
                  <div className="text-xs text-gray-500 font-medium">
                    ✅ Finalized – recording disabled
                  </div>
                )}

                {expandedSteps[step.id] &&
                  steps
                    .filter((s) => s.parentId === step.id)
                    .map((child) => renderStep(child, level + 1))}
              </div>
            </div>
          )}


          {step.type === "gridExtract" && (
            <div className="p-2 rounded border bg-blue-50">
              <div className="font-semibold text-blue-700">
                {step.name || `Grid Extract (${step.id})`}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>ID:</strong> <code>{step.id}</code>
              </div>
              <ul className="text-sm list-disc pl-4 mb-2">
                {step.columnMappings?.map((col) => (
                  <li key={col.header}>
                    {col.header} (Index: {col.columnIndex})
                  </li>
                ))}
              </ul>
              {step.filters?.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Filters:</p>
                  <ul className="list-disc pl-4">
                    {step.filters.map((f, idx) => (
                      <li key={idx}>
                        {f.column} {f.operator} "{f.value}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-1 text-xs ml-2">
          <button
            onClick={() =>
              step.parentId ? deleteSubStep(step) : deleteStep(step.id)
            }
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="col-span-1 bg-white p-4 rounded shadow h-[80vh] overflow-y-auto relative">
      <h2 className="text-lg font-semibold mb-4">Steps</h2>
      <ul className="space-y-2 text-sm">
        {steps
          .filter((step) => step.parentId === undefined || step.parentId === null)
          .map((step) => renderStep(step))}
      </ul>

      {activeLoopId !== null && (
        <div className="flex justify-between items-center mt-4 text-sm bg-green-50 border border-green-300 p-2 rounded">
          <span className="text-green-800">
            Recording inside loop:{" "}
            <strong>
              {steps.find((s) => s.id === activeLoopId)?.name || activeLoopId}
            </strong>
          </span>
          <button onClick={stopLoopRecording} className="text-red-600 underline">
            Finish Loop Recording
          </button>
        </div>
      )}

      <div ref={scrollRef} className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-2">Insert Smart Step</h3>
        <button
          onClick={() => setShowSmartWizard(true)}
          className={`px-3 py-1 rounded text-white ${
            canAddSmartStep ? "bg-blue-600" : "bg-gray-400 cursor-not-allowed"
          }`}
          disabled={!canAddSmartStep}
        >
          Add Smart Step
        </button>
        {!canAddSmartStep && (
          <p className="text-xs text-gray-500 mt-1">
            Enable recording mode to insert new Smart Step.
          </p>
        )}
      </div>

      {showSmartWizard && (
        <Modal onClose={handleCancelWizard}>
          <SmartStepWizard
            pickedTarget={pickedTarget}
            onSmartStepCreated={handleSmartStepCreated}
            onCancel={handleCancelWizard}
            onClose={handleCancelWizard}
            availableExtractSteps={extractSteps}
          />
        </Modal>
      )}
    </section>
  );
}
