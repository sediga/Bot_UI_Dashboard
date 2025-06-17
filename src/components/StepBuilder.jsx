import { useState } from "react";

export default function StepBuilder({ addStep, setCurrentLoop }) {
  const [urlInput, setUrlInput] = useState("");
  const [loopSource, setLoopSource] = useState("");

  const handleNavigate = () => {
    if (!urlInput.trim()) return;
    addStep({ type: "navigate", url: urlInput.trim() });
    setUrlInput("");
  };

  const handleStartLoop = () => {
    if (!loopSource.trim()) return;
    const loopStep = {
      type: "dataLoop",
      source: loopSource.trim(),
      steps: [],
    };
    addStep(loopStep);
    setCurrentLoop(loopStep);
    setLoopSource("");
  };

  return (
    <section className="col-span-2 bg-white p-6 rounded shadow space-y-6">
      <h2 className="text-lg font-semibold">Add New Step</h2>

      {/* Navigate Step */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Navigate to URL</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button
            onClick={handleNavigate}
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow text-sm"
          >
            Go
          </button>
        </div>
      </div>

      {/* Data Loop Step */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Start Data-Driven Loop</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={loopSource}
            onChange={(e) => setLoopSource(e.target.value)}
            placeholder="Loop source (e.g. patients)"
            className="flex-1 px-3 py-2 border rounded text-sm"
          />
          <button
            onClick={handleStartLoop}
            className="px-4 py-2 bg-yellow-600 text-white rounded shadow text-sm"
          >
            Start Loop
          </button>
        </div>
      </div>

      {/* Export Button */}
      <div className="pt-4">
        <button
          onClick={() => {
            const json = JSON.stringify(addStep.steps || [], null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "recorded_steps.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-6 py-2 bg-green-600 text-white rounded text-sm shadow"
        >
          Export JSON
        </button>
      </div>
    </section>
  );
}
