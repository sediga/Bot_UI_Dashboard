import { useState } from "react";

/**
 * CounterLoopWizard
 * Props:
 *  - mode: "create" | "edit"
 *  - initial: { stepName, loopCount }
 *  - onCreate(updatedStep)
 *  - onCancel()
 */
export default function CounterLoopWizard({
  mode = "create",
  initial = {},
  onCreate,
  onTest,
  onCancel,
}) {
  const [stepName, setStepName]   = useState(initial.stepName || "");
  const [loopCount, setLoopCount] = useState(
    Number.isFinite(initial.loopCount) ? initial.loopCount : 1
  );

  const save = () => {
    const payload = {
      id: initial.id || `loopstep_${Date.now()}`,
      type: "counterloop",
      loopType: "counter",
      name: stepName.trim(),
      loopCount: Math.max(1, parseInt(loopCount, 10) || 1),
      actionsPerRow: initial.actionsPerRow || [],
    };
    onCreate?.(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure</span>
      </div>

      <div>
        <label className="block mb-2">Loop Count</label>
        <input
          type="number"
          className="w-full border px-2 py-1 rounded"
          min={1}
          value={loopCount}
          onChange={(e) => setLoopCount(parseInt(e.target.value, 10) || 0)}
        />
      </div>

      <div>
        <label className="block mb-2">Step Name</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="e.g., Repeat 3 times"
        />
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={save}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={!stepName.trim() || loopCount < 1}
        >
          {mode === "edit" ? "Save Changes" : "Add Loop Step"}
        </button>
      </div>
    </div>
  );
}
