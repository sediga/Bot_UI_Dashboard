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
  setCurrentLoopId, // ✅ Added this
}) {
  const [expandedSteps, setExpandedSteps] = useState({});
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [activeLoopIndex, setActiveLoopIndex] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const initialExpanded = {};
    steps.forEach((step, index) => {
      if (["dataLoop", "counterloop", "loop"].includes(step.type)) {
        initialExpanded[index] = true;
      }
    });
    setExpandedSteps(initialExpanded);
  }, [steps]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps]);

  const toggleExpand = (index) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const deleteStep = (index) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
  };

  const handleSmartStepCreated = (step) => {
    if (activeLoopIndex !== null) {
      const updated = [...steps];
      if (!updated[activeLoopIndex].actionsPerRow) {
        updated[activeLoopIndex].actionsPerRow = [];
      }
      updated[activeLoopIndex].actionsPerRow.push(step);
      setSteps(updated);
      setPickedTarget(null);
      setShowSmartWizard(false);
      return;
    }

    setSteps((prev) => [...prev, step]);
    setPickedTarget(null);
    setShowSmartWizard(false);
  };

  const handleCancelWizard = () => {
    setPickedTarget(null);
    setShowSmartWizard(false);
    fetch(`${config.agentServerUrl}/api/target-pick-done`, {
      method: "POST",
    }).catch((err) => console.error("Failed to notify agent on cancel:", err));
  };

  const extractSteps = steps.filter((step) => step.type === "smartExtract");

  const canAddSmartStep = agentStatus === "recording" && !showSmartWizard && activeLoopIndex === null;

  const startLoopRecording = async (i, name) => {
    try {
      await fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loopIndex: i, loopName: name || `Loop_${i}` }),
      });
      setActiveLoopIndex(i);
      setCurrentLoopId(steps[i]?.id); // ✅ Set loop ID for StepBuilder
    } catch (err) {
      console.error("Failed to start loop recording", err);
    }
  };

  const stopLoopRecording = async () => {
    try {
      await fetch(`${config.agentServerUrl}/api/end-loop-recording`, { method: "POST" });
    } catch (err) {
      console.error("Failed to end loop recording", err);
    } finally {
      setActiveLoopIndex(null);
      setCurrentLoopId(null); // ✅ Clear loop ID
    }
  };

  const isChildStep = (step) =>
    steps.some((parent) =>
      Array.isArray(parent.actionsPerRow) &&
      parent.actionsPerRow.some((child) => child.id === step.id)
    );

  return (
    <section className="col-span-1 bg-white p-4 rounded shadow h-[80vh] overflow-y-auto relative">
      <h2 className="text-lg font-semibold mb-4">Steps</h2>

      <ul className="space-y-2 text-sm">
        {steps.map((step, i) => {
          if (isChildStep(step)) return null;

          return (
            <li key={i} className="bg-slate-100 p-3 rounded shadow flex justify-between items-start">
              <div className="flex-1 pr-2 space-y-1">
                {step.type === "navigate" && (
                  <div>
                    <span className="font-medium text-indigo-600">Navigate:</span>{" "}
                    <span className="text-gray-700">{step.url}</span>
                  </div>
                )}

                {step.type === "uiAction" && (
                  <div>
                    <span className="font-medium text-purple-600">{step.action}</span> →{" "}
                    <span className="text-slate-700">
                      {step.label || <code>{step.selector}</code>}
                    </span>
                    {step.value && (
                      <span className="text-green-600 ml-1">= "{step.value}"</span>
                    )}
                  </div>
                )}

                {(step.type === "loop" || step.type === "counterloop") && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-orange-600">
                        {step.name || `Loop (${step.source || step.id})`}
                      </div>
                      <button onClick={() => toggleExpand(i)} className="text-xs text-blue-600 ml-4">
                        {expandedSteps[i] ? "[−]" : "[+]" }
                      </button>
                    </div>

                    {activeLoopIndex === i ? (
                      <div className="text-xs text-green-700 font-medium">
                        🎤 Recording steps inside this loop…
                      </div>
                    ) : (
                      <button
                        className="text-xs text-blue-600 underline"
                        onClick={() => startLoopRecording(i, step.name)}
                      >
                        ➕ Record inside this loop
                      </button>
                    )}

                    {expandedSteps[i] && step.actionsPerRow?.length > 0 && (
                      <ul className="ml-4 pl-2 border-l border-gray-300 space-y-1 text-xs text-gray-700 mt-2">
                        {step.actionsPerRow.map((sub, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{sub.action}</span> →{" "}
                            <code>{sub.selector || "n/a"}</code>
                            {sub.value && (
                              <> = <span className="text-green-700">{sub.value}</span></>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {step.type === "smartExtract" && (
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

                {step.type === "dataLoop" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-blue-700">
                        {step.name || `Smart Loop (${step.id})`}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        <strong>ID:</strong> <code>{step.id}</code>
                      </div>
                      <button onClick={() => toggleExpand(i)} className="text-xs text-blue-600 ml-2">
                        {expandedSteps[i] ? "[−]" : "[+]" }
                      </button>
                    </div>

                    {activeLoopIndex === i ? (
                      <div className="text-xs text-green-700 font-medium">
                        🎤 Recording steps inside this loop…
                      </div>
                    ) : (
                      <button
                        className="text-xs text-blue-600 underline"
                        onClick={() => startLoopRecording(i, step.name)}
                      >
                        ➕ Record inside this loop
                      </button>
                    )}

                    {expandedSteps[i] && step.actionsPerRow?.length > 0 && (
                      <ul className="ml-4 pl-2 border-l border-gray-300 space-y-1 text-xs text-gray-700 mt-2">
                        {step.actionsPerRow.map((sub, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{sub.action}</span> →{" "}
                            <code>{sub.selector || "n/a"}</code>
                            {sub.value && (
                              <> = <span className="text-green-700">{sub.value}</span></>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-1 text-xs ml-2">
                <button
                  onClick={() => deleteStep(i)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {activeLoopIndex !== null && (
        <div className="flex justify-between items-center mt-4 text-sm bg-green-50 border border-green-300 p-2 rounded">
          <span className="text-green-800">
            Recording inside loop: <strong>{steps[activeLoopIndex]?.name || activeLoopIndex}</strong>
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
