import { useEffect, useState } from "react";
import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import ReplayPanel from "./ReplayPanel";
import config from "../config";

export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoopId, setCurrentLoopId] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [agentStatus, setAgentStatus] = useState("unknown");
  const [pickedTarget, setPickedTarget] = useState(null);

  const actionPriority = (action) => {
    if (action === "type") return 3;
    if (action === "change") return 2;
    if (action === "focus") return 1;
    return 0;
  };

  const normalizeStep = (s) => ({
    ...s,
    selector: s.selector?.replace(/\\["']/g, "").trim(),
    improvedSelector: s.improvedSelector?.replace(/\\["']/g, "").trim(),
  });

  const isSameActionGroup = (a1, a2) => {
    const groupA = ["type", "change", "input"];
    return groupA.includes(a1) && groupA.includes(a2);
  };

  const isRedundant = (prev, next) => {
    return (
      prev.selector === next.selector &&
      prev.value === next.value &&
      prev.url === next.url &&
      (
        prev.action === next.action ||
        isSameActionGroup(prev.action, next.action)
      )
    );
  };

  const addStep = (step) => {
    const newStep = normalizeStep(step);

    if (currentLoopId) {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.id !== currentLoopId) return s;
          const group = s.steps || [];
          const last = group[group.length - 1];
          if (last && isRedundant(last, newStep)) {
            const shouldReplace = actionPriority(newStep.action) > actionPriority(last.action);
            if (shouldReplace) {
              const updated = [...group];
              updated[updated.length - 1] = newStep;
              return { ...s, steps: updated };
            }
            return s;
          }
          return { ...s, steps: [...group, newStep] };
        })
      );
    } else {
      setSteps((prev) => {
        const last = prev[prev.length - 1];
        if (last && isRedundant(last, newStep)) {
          const shouldReplace = actionPriority(newStep.action) > actionPriority(last.action);
          if (shouldReplace) {
            const updated = [...prev];
            updated[updated.length - 1] = newStep;
            return updated;
          }
          return prev;
        }
        return [...prev, newStep];
      });
    }
  };

  const updateStepWithImprovedSelector = (stepId, enrichedStep) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, ...enrichedStep } : step
      )
    );
  };

  const clearSteps = () => {
    setSteps([]);
    setCurrentLoopId(null);
  };

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const res = await fetch(`${config.agentServerUrl}/api/status`);
        const data = await res.json();
        setAgentStatus(data.running ? "running" : "stopped");
      } catch (err) {
        console.error("Error checking agent status:", err);
        setAgentStatus("unknown");
      }
    };

    checkAgentStatus();
    const interval = setInterval(checkAgentStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
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

      {["stopped", "unknown"].includes(agentStatus) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 m-6 rounded">
          <p className="font-semibold">Botflows Agent not running.</p>
          <p className="text-sm mt-1">To enable recording and replay, please install and run the Botflows Agent.</p>
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
            <strong>Important:</strong> This installer is currently not digitally signed.
            <br />
            You may see a SmartScreen warning from Windows. To proceed:
            <ul className="list-disc list-inside mt-1 ml-2 text-sm">
              <li>Click <em>"More info"</em></li>
              <li>Then click <em>"Run anyway"</em></li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <main className="grid grid-cols-3 gap-4 p-6">
          <StepBuilder
            addStep={addStep}
            setCurrentLoopId={setCurrentLoopId}
            clearSteps={clearSteps}
            steps={steps}
            updateStepWithImprovedSelector={updateStepWithImprovedSelector}
            setPickedTarget={setPickedTarget}
          />
          <StepList
            steps={steps}
            setSteps={setSteps}
            pickedTarget={pickedTarget}
            setPickedTarget={setPickedTarget} // <-- This line fixes the error
          />
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
