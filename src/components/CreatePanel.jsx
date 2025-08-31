import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import { useRef } from "react";

export default function CreatePanel({
  steps,
  setSteps,
  addStep,
  clearSteps,
  updateStepWithImprovedSelector,
  pickedTarget,
  setPickedTarget,
  agentStatus,
  logs,
  setLogs,
  recordMessages,
  setRecordMessages,
  ensureWebSocket,
  currentLoopId,
  setCurrentLoopId,
  leftWidth,
  leftPanelRef,
  startResizing
}) {
  // OS Detection (macOS)
  const isMacOS = () => /Mac/i.test(navigator.platform || navigator.userAgent);
  const showMacWarning = isMacOS();

  function openCustomProtocol(href) {
  // Must be user-gesture initiated in modern browsers.
  // Use a normal window.location change — the OS will hand off to the app handler.
  // If not installed, nothing happens; the page stays.
  window.location.href = href;
}

  return (
    <main className="relative flex h-full w-full overflow-hidden">
      {/* macOS Warning Overlay */}
      {showMacWarning && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-50 flex items-center justify-center px-6">
          <div className="bg-red-100 border border-red-400 text-red-800 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg">macOS Not Supported (Yet)</p>
            <p className="text-sm mt-2">
              The Flowtra Agent currently works only on Windows.
              We're actively working on macOS compatibility. Please try again on a Windows machine to record and replay flows.
            </p>
          </div>
        </div>
      )}

      {/* Agent Not Running Warning */}
{!showMacWarning && ["stopped", "unknown"].includes(agentStatus) && (
  <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
    <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
      <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent Required</p>
      <p className="text-sm mb-4">
        To start recording and replaying flows, please install and run the Flowtra Agent on your computer.
      </p>

      <button
        className="installAgent mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        onClick={() => {
          const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe";
          const link = document.createElement("a");
          link.href = url;
          link.download = "FlowtraAgentInstaller.exe";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }}
      >
        Download Flowtra Agent
      </button>
      <div className="p-3 bg-gray-50 border border-gray-300 text-sm text-gray-800 rounded">
        <strong>Note:</strong> This installer is not digitally signed yet.<br />
        If you see a SmartScreen warning in Windows:
        <ul className="list-disc list-inside mt-1 ml-4">
          <li>Click <em>"More info"</em></li>
          <li>Then click <em>"Run anyway"</em></li>
        </ul>
      </div>
      <p className="text-sm mb-4">
        If you have already installed the agent, please ensure it is running. You can start it from your programs menu.
      </p>

      <button
        className="installAgent mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        onClick={() => {
          const token = Math.random().toString(36).slice(2);
          openCustomProtocol(`flowtra://bootstrap?token=${encodeURIComponent(token)}`);
        }}
      >
        Start Flowtra Agent
      </button>

    </div>
  </div>
)}

      {/* Left Panel */}
      <div
        ref={leftPanelRef}
        className="h-full min-w-[200px] max-w-[80%] overflow-auto"
        style={{ width: leftWidth }}
      >
        <StepBuilder
          onEnsureWebSocket={ensureWebSocket}
          isMounted={true}
          addStep={addStep}
          clearSteps={clearSteps}
          steps={steps}
          updateStepWithImprovedSelector={updateStepWithImprovedSelector}
          setPickedTarget={setPickedTarget}
          currentLoopId={currentLoopId}
          setCurrentLoopId={setCurrentLoopId}
          setSteps={setSteps}
          agentStatus={agentStatus}
          logs={logs}
          setLogs={setLogs}
          rawMessages={recordMessages}
          setRawMessages={setRecordMessages}
        />
      </div>

      {/* Draggable Divider */}
      <div className="w-2 cursor-col-resize bg-gray-300" onMouseDown={startResizing} />

      {/* Right Panel */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <StepList
            steps={steps}
            setSteps={setSteps}
            pickedTarget={pickedTarget}
            setPickedTarget={setPickedTarget}
            agentStatus={agentStatus}
            currentLoopId={currentLoopId}
            setCurrentLoopId={setCurrentLoopId}
            logs={logs}
          />
        </div>
      </div>
    </main>
  );
}
