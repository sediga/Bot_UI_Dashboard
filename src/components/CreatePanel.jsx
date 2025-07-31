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
  return (
    <main className="relative flex h-full w-full overflow-hidden">
      {/* Overlay */}
      {["stopped", "unknown"].includes(agentStatus) && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-yellow-800 mb-2">Botflows Agent not running.</p>
            <p className="text-sm mb-4">
              To enable recording and replay, please install and run the Botflows Agent.
            </p>

            <button
              className="installAgent mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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

            <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded text-sm">
              <strong>Important:</strong> This installer is currently not digitally signed.<br />
              You may see a SmartScreen warning from Windows. To proceed:
              <ul className="list-disc list-inside mt-1 ml-4">
                <li>Click <em>"More info"</em></li>
                <li>Then click <em>"Run anyway"</em></li>
              </ul>
            </div>
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
