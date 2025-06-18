import { useEffect, useState } from "react";
import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import ReplayPanel from "./ReplayPanel";

export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoopId, setCurrentLoopId] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [agentStatus, setAgentStatus] = useState("unknown");

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

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/status");
        const data = await res.json();
        console.log("Agent status response:", data); // Optional debug log
        setAgentStatus(data.running ? "running" : "stopped");
      } catch (err) {
        console.error("Error checking agent status:", err);
        setAgentStatus("unknown");
      }
    };

    checkAgentStatus(); // Run immediately on mount
    const interval = setInterval(checkAgentStatus, 1000); // Poll every 1 second

    return () => clearInterval(interval); // Clean up on unmount
  }, []);

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

      {/* Agent Install Prompt */}
      {["stopped", "unknown"].includes(agentStatus)  && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 m-6 rounded">
          <p className="font-semibold">Botflows Agent not running.</p>
          <p className="text-sm mt-1">
            To enable recording and replay, please install and run the Botflows Agent.
          </p>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => {
              const url = "https://botflows.app/downloads/BotflowsAgentInstaller.exe";
              const link = document.createElement("a");
              link.href = url;
              link.download = "BotflowsAgentInstaller.exe";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Download Botflows Agent
          </button>

          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-800 rounded">
            <strong>⚠ Important:</strong> This installer is currently not digitally signed.
            <br />
            You may see a SmartScreen warning from Windows. To proceed:
            <ul className="list-disc list-inside mt-1 ml-2 text-sm">
              <li>Click <em>"More info"</em></li>
              <li>Then click <em>"Run anyway"</em></li>
            </ul>
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === "create" && (
        <main className="grid grid-cols-3 gap-4 p-6">
        <StepBuilder
          addStep={addStep}
          setCurrentLoopId={setCurrentLoopId}
          clearSteps={clearSteps}  // <-- Add this line
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
