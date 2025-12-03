import { useState } from "react";
import config from "../../config";

/**
 * DataLoopWizard
 * Props:
 *  - mode: "create" | "edit"
 *  - initial: { stepName, selectedSource }
 *  - availableExtractSteps: gridExtract[] (for dropdown)
 *  - onCreate(updatedStep)
 *  - onCancel()
 */
export default function DataLoopWizard({
  mode = "create",
  initial = {},
  availableExtractSteps = [],
  onCreate,
  onTest,
  onCancel,
}) {
  const [stepName, setStepName]         = useState(initial.stepName || "");
  const [selectedSource, setSelectedSource] = useState(initial.selectedSource || "");

  const save = async () => {
    const payload = {
      id: initial.id || `dataloopStep_${Date.now()}`,
      type: "dataLoop",
      loopType: "dataset",
      name: stepName.trim(),
      source: selectedSource,
      actionsPerRow: initial.actionsPerRow || [],
    };

    // Notify agent to prep recording only in create mode (keep edit passive)
    if (mode === "create") {
      const sourceStep = availableExtractSteps.find((s) => s.id === selectedSource);
      try {
        await fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loopId: payload.id,
            loopName: payload.name,
            sourceStep,
          }),
        });
      } catch {}
    }

    onCreate?.(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure</span>
      </div>

      <div>
        <label className="block mb-2">Select Extract Step</label>
        <select
          className="w-full border px-2 py-1 rounded"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="">-- Choose --</option>
          {availableExtractSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name || step.id} (
              {Array.isArray(step.columnMappings)
                ? step.columnMappings.map((c) => c.header?.header || c.header).join(", ")
                : ""}
              )
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">Step Name</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="e.g., For each extracted row"
        />
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={save}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={!selectedSource || !stepName.trim()}
        >
          {mode === "edit" ? "Save Changes" : "Add Loop Step"}
        </button>
      </div>
    </div>
  );
}
