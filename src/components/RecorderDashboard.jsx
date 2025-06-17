import { useState } from "react";
import StepList from "./StepList";
import StepBuilder from "./StepBuilder";

export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoop, setCurrentLoop] = useState(null);

  const addStep = (step) => {
    if (currentLoop) {
      setSteps((prev) =>
        prev.map((s) =>
          s === currentLoop ? { ...s, steps: [...s.steps, step] } : s
        )
      );
    } else {
      setSteps((prev) => [...prev, step]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-indigo-600">Botflows Recorder</h1>
        <div>
          <button className="px-4 py-1 bg-green-600 text-white rounded shadow mr-2">
            Start
          </button>
          <button className="px-4 py-1 bg-red-600 text-white rounded shadow">
            Stop
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-3 gap-4 p-6">
        <StepList steps={steps} setSteps={setSteps} />
        <StepBuilder addStep={addStep} setCurrentLoop={setCurrentLoop} />
      </main>
    </div>
  );
}
