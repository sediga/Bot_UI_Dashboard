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

  // --- Platform detection (macOS) ---
  const isMacOS = useMemo(() => /Mac/i.test(navigator.platform || navigator.userAgent), []);
  const showMacWarning = isMacOS;

  // --- Auto-start state ---
  // "idle" | "starting" | "waiting" | "ready" | "failed"
  const [autoStartState, setAutoStartState] = useState("idle");

  // Upgrade state: initialize from localStorage in case we missed the event
  const [isUpgrading, setIsUpgrading] = useState(
    () => localStorage.getItem("flowtra_upgrading") === "1"
  );

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

  // track upgrading in a ref to guard inside timeouts
  const upgradingRef = useRef(isUpgrading);
  useEffect(() => { upgradingRef.current = isUpgrading; }, [isUpgrading]);

  // --- Respond to banner upgrade events ---
  useEffect(() => {
    const onUpgradeStart = () => {
      setIsUpgrading(true);
      clearWaitingWindow();
      triedProtocolRef.current = false;
      setAutoStartState("idle");
    };
    const onUpgradeDone = () => {
      setIsUpgrading(false);
    };

    window.addEventListener("flowtra:upgrade-start", onUpgradeStart);
    window.addEventListener("flowtra:upgrade-done", onUpgradeDone);

    // Also track cross-tab / missed-event changes via localStorage
    const onStorage = (e) => {
      if (e.key === "flowtra_upgrading") {
        setIsUpgrading(e.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("flowtra:upgrade-start", onUpgradeStart);
      window.removeEventListener("flowtra:upgrade-done", onUpgradeDone);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // --- Utilities ---
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
        setAutoStartState("failed");
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearWaitingWindow();
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, []);

  // If/when agent becomes running, mark ready and ensure WS
  useEffect(() => {
    if (agentStatus === "running") {
      setAutoStartState("ready");
      clearWaitingWindow();
      ensureWebSocket?.();
      if (isUpgrading) setIsUpgrading(false); // defensive
    }
  }, [agentStatus, ensureWebSocket, isUpgrading]);

  // Delay 1s before attempting auto-start (lets parent ping set status).
  // Only auto-start if we've seen the agent before AND not upgrading.
  useEffect(() => {
    if (showMacWarning) return;
    if (isUpgrading) return;
    if (agentStatus === "running") return;

    // clear any prior delay
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }

    delayTimerRef.current = setTimeout(() => {
      // guard again in case upgrade began after scheduling
      if (upgradingRef.current) return;

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
  }, [agentStatus, autoStartState, showMacWarning, isUpgrading]);

  // Manual retry (used only on failure overlay)
  function retryStart() {
    if (isUpgrading) return;
    triedProtocolRef.current = false;
    setAutoStartState("starting");
    const token = Math.random().toString(36).slice(2);
    openCustomProtocolOnce(`flowtra://bootstrap?token=${encodeURIComponent(token)}`);
    startWaitingWindow(10000);
  }

  // --- UI flags ---
  const seenOnce = seenRef.current;

  // Non-blocking banner while we auto-start (kept; easy to remove if you prefer)
  const showStartingBanner =
    !showMacWarning &&
    !isUpgrading &&
    ["starting", "waiting"].includes(autoStartState) &&
    agentStatus !== "running" &&
    seenOnce;

  // We now ONLY show an overlay in these cases:
  //  1) macOS block
  //  2) upgrading (read-only)
  //  3) never seen (installer)
  //  4) auto-start failed (fallback)
  const showInstallerOverlay = !showMacWarning && agentStatus !== "running" && !seenOnce && !isUpgrading;
  const showFailedOverlay    = !showMacWarning && agentStatus !== "running" && autoStartState === "failed" && !isUpgrading;

  return (
    <main className="relative flex h-full w-full overflow-hidden">
      {/* macOS Warning Overlay */}
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

      {/* Auto-start banner (non-blocking, only if seen before and not upgrading) */}
      {showStartingBanner && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-blue-600 text-white text-sm rounded px-3 py-2 shadow">
            Starting Flowtra Agent… (waiting for local status)
          </div>
        </div>
      )}

      {/* 🔒 Upgrading overlay (read-only) */}
      {!showMacWarning && isUpgrading && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent</p>
            <p className="text-sm">
              Updating Flowtra Agent… We’ll relaunch it automatically when the update finishes.
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Please don’t start the Agent manually right now—doing so could interrupt the upgrade.
            </p>
          </div>
        </div>
      )}

      {/* Never-seen installer overlay */}
      {showInstallerOverlay && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent</p>
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
          </div>
        </div>
      )}

      {/* Auto-start failed overlay (fallback) */}
      {showFailedOverlay && (
        <div className="absolute inset-0 bg-white bg-opacity-95 z-40 flex items-center justify-center px-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-lg shadow max-w-xl w-full">
            <p className="font-semibold text-lg text-blue-800 mb-2">Flowtra Agent</p>
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
