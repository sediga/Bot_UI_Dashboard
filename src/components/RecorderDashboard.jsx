import { useState } from "react";
import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import ReplayPanel from "./ReplayPanel";

export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoopId, setCurrentLoopId] = useState(null);
  const [activeTab, setActiveTab] = useState("create");

  const addStep = (step) => {
    if (currentLoopId) {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === currentLoopId
            ? { ...s, steps: [...(s.steps || []), step] }
            : s
        )
      );
    } else {
      setSteps((prev) => [...prev, step]);
    }
  };

  const clearSteps = () => {
    setSteps([]);
    setCurrentLoopId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-indigo-600">Botflows Dashboard</h1>
        <nav className="space-x-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab("create")}
            className={activeTab === "create" ? "text-indigo-700" : "text-gray-500"}
          >
            Create Flow
          </button>
          <button
            onClick={() => setActiveTab("replay")}
            className={activeTab === "replay" ? "text-indigo-700" : "text-gray-500"}
          >
            Replay
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={activeTab === "config" ? "text-indigo-700" : "text-gray-500"}
          >
            Configure
          </button>
        </nav>
      </header>

      {/* Main Grid */}
      {activeTab === "create" && (
        <main className="grid grid-cols-3 gap-4 p-6">
          <StepBuilder
            addStep={addStep}
            setCurrentLoopId={setCurrentLoopId}
            clearSteps={clearSteps}
            steps={steps}
          />
          <StepList steps={steps} setSteps={setSteps} />
        </main>
      )}
      {activeTab === "replay" && (
        <main className="grid grid-cols-3 gap-4 p-6">
          <ReplayPanel />
        </main>
      )}
    </div>
  );
}
