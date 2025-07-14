import { useEffect, useState } from "react";
import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import ReplayPanel from "./ReplayPanel";
import config from "../config";
import { useAuth } from "../contexts/AuthContext";

export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoopId, setCurrentLoopId] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [agentStatus, setAgentStatus] = useState("unknown");
  const [pickedTarget, setPickedTarget] = useState(null);
  const { logout } = useAuth();

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
    devToolsSelector: s.devToolsSelector?.replace(/\\["']/g, "").trim(),
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

    if (step.parentId) {
      newStep.parentId = step.parentId;
    }

    setSteps((prev) => [...prev, newStep]);
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
        if (data.replaying) {
          setAgentStatus("replaying");
        } else if (data.recording) {
          setAgentStatus("recording");
        } else if (data.running) {
          setAgentStatus("running");
        } else if (data.stopped) {
          setAgentStatus("stopped");
        } else {
          setAgentStatus("idle");
        }
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
      <div className="flex space-x-4 px-6 py-2 bg-white border-b">
        <div className="bg-white px-6 pt-4 shadow-sm">
          <nav className="flex space-x-2" aria-label="Tabs">
            {["create", "replay", "config"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-md text-sm font-medium ${
                  activeTab === tab
                    ? "bg-indigo-100 text-indigo-700 shadow-inner border border-b-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab === "create" && "Create Flow"}
                {tab === "replay" && "Replay"}
                {tab === "config" && "Configure"}
              </button>
            ))}
          </nav>
        </div>

      </div>

      {["stopped", "unknown"].includes(agentStatus) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 m-6 rounded">
          <p className="font-semibold">Botflows Agent not running.</p>
          <p className="text-sm mt-1">To enable recording and replay, please install and run the Botflows Agent.</p>
          <button
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            onClick={() => {
              const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/BotflowsAgentInstaller.exe";
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
            clearSteps={clearSteps}
            steps={steps}
            updateStepWithImprovedSelector={updateStepWithImprovedSelector}
            setPickedTarget={setPickedTarget}
            currentLoopId={currentLoopId}
            setSteps={setSteps}
          />
          <StepList
            steps={steps}
            setSteps={setSteps}
            pickedTarget={pickedTarget}
            setPickedTarget={setPickedTarget}
            agentStatus={agentStatus}
            setCurrentLoopId={setCurrentLoopId}
          />
        </main>
      )}

      {activeTab === "replay" && (
        <main className="grid grid-cols-3 gap-4 p-6">
          <ReplayPanel />
        </main>
      )}

      {activeTab === "config" && (
        <main className="p-6 text-gray-600">
          <h2 className="text-lg font-semibold mb-2">Configuration</h2>
          <p>Coming soon: Configure agent settings, integrations, and replay options.</p>
        </main>
      )}
    </div>
  );
}
