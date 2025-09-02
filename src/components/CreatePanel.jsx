import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import { useEffect, useMemo, useRef, useState } from "react";

export default function CreatePanel(props) {
  const {
    steps,
    setSteps,
    addStep,
    clearSteps,
    updateStepWithImprovedSelector,
    pickedTarget,
    setPickedTarget,
    agentStatus,   // "running" | "stopped" | "unknown" (updated every second by parent)
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
  } = props;

  // macOS gate
  const isMacOS = useMemo(() => /Mac/i.test(navigator.platform || navigator.userAgent), []);
  const showMacWarning = isMacOS;

  // auto-start state
  const [autoStartState, setAutoStartState] = useState("idle"); // "idle" | "starting" | "waiting" | "ready" | "failed"

  // timers/flags
  const triedProtocolRef = useRef(false);
  const waitingTimerRef = useRef(null);
  const delayTimerRef = useRef(null);

  // live refs to avoid stale closures
  const latestStatusRef = useRef(agentStatus);
  useEffect(() => { latestStatusRef.current = agentStatus; }, [agentStatus]);

  const seenRef = useRef(localStorage.getItem("flowtra_seen") === "1");
  useEffect(() => {
    if (agentStatus === "running") {
      localStorage.setItem("flowtra_seen", "1");
      seenRef.current = true;
    }
  }, [agentStatus]);

  // utils
  function clearWaitingWindow() {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
  }
  function startWaitingWindow(ms = 10000) {
    clearWaitingWindow();
    setAutoStartState("waiting");
    waitingTimerRef.current = setTimeout(() => {
      if (latestStatusRef.current !== "running") {
        setAutoStartState("failed"); // triggers fallback overlay with Download
      }
    }, ms);
  }
  function openCustomProtocolOnce(href) {
    if (triedProtocolRef.current) return;
    triedProtocolRef.current = true;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = href;
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 4000);
  }

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearWaitingWindow();
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, []);

  // when agent becomes running
  useEffect(() => {
    if (agentStatus === "running") {
      setAutoStartState("ready");
      clearWaitingWindow();
      ensureWebSocket?.();
    }
  }, [agentStatus, ensureWebSocket]);

  // delayed auto-start attempt (only if seen before)
  useEffect(() => {
    if (showMacWarning) return;
    if (agentStatus === "running") return;

    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    delayTimerRef.current = setTimeout(() => {
      const statusNow = latestStatusRef.current;
      const seenNow = seenRef.current;

      if (
        ["stopped", "unknown"].includes(statusNow ?? "unknown") &&
        autoStartState === "idle" &&
        seenNow &&
        !triedProtocolRef.current
      ) {
        setAutoStartState("starting");
        const token = Math.random().toString(36).slice(2);
        openCustomProtocolOnce(`flowtra://bootstrap?token=${encodeURIComponent(token)}`);
        startWaitingWindow(10000); // grace window
      }
    }, 1000);

    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, [agentStatus, autoStartState, showMacWarning]);

  // manual retry
  function retryStart() {
    triedProtocolRef.current = false;
    setAutoStartState("starting");
    const token = Math.random().toString(36).slice(2);
    openCustomProtocolOnce(`flowtra://bootstrap?token=${encodeURIComponent(token)}`);
    startWaitingWindow(10000);
  }

  // UI flags
  const showAgentOverlay = !showMacWarning && agentStatus !== "running";
  const seenOnce = seenRef.current;

  const showStartingBanner =
    !showMacWarning &&
    ["starting", "waiting"].includes(autoStartState) &&
    agentStatus !== "running" &&
    seenOnce;

  return (
    <main className="relative flex h-full w-full overflow-hidden">
      {/* macOS overlay */}
      {showMacWarning && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-50 flex items-center justify-center px-6">
          <div className="bg-red-100 border border-red-400 text-red-800 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg">macOS Not Supported (Yet)</p>
            <p className="text-sm mt-2">
              Flowtra Agent currently works only on Windows. We’re working on macOS support. Please use a Windows machine for now.
            </p>
          </div>
        </div>
      )}

      {/* non-blocking banner during auto-start (seen-only) */}
      {showStartingBanner && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-blue-600 text-white text-sm rounded px-3 py-2 shadow">
            Starting Flowtra Agent… (waiting for local status)
          </div>
        </div>
      )}

      {/* overlay whenever agent not running */}
      {showAgentOverlay && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent</p>

            {/* Never seen → installer overlay */}
            {!seenOnce ? (
              <>
                <p className="text-sm mb-4">
                  To record and replay flows, please install and run the Flowtra Agent.
                </p>
                <button
                  className="installAgent mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onClick={() => {
                    const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe";
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "FlowtraAgentInstaller.exe";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  Download Flowtra Agent
                </button>
                <div className="p-3 bg-gray-50 border border-gray-300 text-sm text-gray-800 rounded">
                  <strong>Note:</strong> This installer is not digitally signed yet.
                  <ul className="list-disc list-inside mt-1 ml-4">
                    <li>Windows SmartScreen → click <em>“More info”</em></li>
                    <li>Then click <em>“Run anyway”</em></li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* Seen before → two states:
                    - trying (idle/starting/waiting): auto-start overlay WITHOUT download
                    - failed: fallback overlay WITH download */}
                {autoStartState === "failed" ? (
                  <>
                    <p className="text-sm mb-4">
                      We tried to start the Agent automatically but couldn’t connect. You can download the installer or try again:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                        onClick={retryStart}
                      >
                        Try Again
                      </button>
                      <button
                        className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        onClick={() => {
                          const url = "https://github.com/sediga/Bot_UI_Dashboard/releases/latest/download/FlowtraAgentInstaller.exe";
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "FlowtraAgentInstaller.exe";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                      >
                        Download Flowtra Agent
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-4">
                      Your Agent isn’t running. Click Start Agent to try to start it. You can also start it manually from startup menu or desktop shortcut.:
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
                        onClick={retryStart}
                      >
                        Start Agent
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
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

      {/* Divider */}
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
