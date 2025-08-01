import { useEffect, useState } from "react";
import { useRef } from "react";
import StepBuilder from "./StepBuilder";
import StepList from "./StepList";
import ReplayPanel from "./ReplayPanel";
import config from "../config";
import Header from "./Header";
import { useAuth } from "../contexts/AuthContext";
import DashboardTour from './DashboardTour'; // Adjust path as needed
import CreatePanel from "./CreatePanel";
import ConfigurePanel from "./ConfigurePanel";
import SectionWithBackground from "./SectionWithBackground";


export default function RecorderDashboard() {
  const [steps, setSteps] = useState([]);
  const [currentLoopId, setCurrentLoopId] = useState(null);
  const [activeTab, setActiveTab] = useState("create");
  const [agentStatus, setAgentStatus] = useState("unknown");
  const [pickedTarget, setPickedTarget] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rawMessages, setRawMessages] = useState([]);
  const token = localStorage.getItem("botflows_token");
  const { user } = useAuth();
  const userId = user?.userId;
  const [pendingTab, setPendingTab] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const isRecording = agentStatus === "recording";
  const [replayMessages, setReplayMessages] = useState([]);
  const [recordMessages, setRecordMessages] = useState([]);
  const activeTabRef = useRef(activeTab);

  const [runTour, setRunTour] = useState(() => {
    return localStorage.getItem("botflows_tour_skipped") !== "true";
  });


  const stopRecording = async () => {
    try {
      const res = await fetch(`${config.agentServerUrl}/api/stop`, {
        method: "POST",
      });
      const result = await res.json();
      console.log("Recording stopped:", result);
      setAgentStatus("idle");
    } catch (err) {
      console.error("Failed to stop recording:", err);
    }
  };

  const handleTabChange = (newTab) => {
    if (isRecording) {
      setPendingTab(newTab);       // store tab to switch to
      setShowConfirm(true);        // trigger confirmation modal
    } else {
      setActiveTab(newTab);        // safe to switch directly
    }
  };

  const confirmTabSwitch = async () => {
    setShowConfirm(false);
    if (pendingTab) {
      await stopRecording();       // send stop to agent and wait
      setActiveTab(pendingTab);    // now switch tab
      setPendingTab(null);
    }
  };

  const cancelTabSwitch = () => {
    setShowConfirm(false);
    setPendingTab(null);
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

  const MAX_RETRIES = 5;
  const RETRY_DELAY = 3000; // ms
  const socketRef = useRef({});

  function ensureWebSocket(channel, isMounted) {
    return new Promise((resolve, reject) => {
      const existing = socketRef.current[channel];
      if (existing && existing.readyState === WebSocket.OPEN) {
        return resolve(existing);
      }

      connectWebSocket(channel, isMounted);
      const interval = setInterval(() => {
        const ws = socketRef.current[channel];
        if (ws && ws.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          resolve(ws);
        }
      }, 300);

      setTimeout(() => {
        clearInterval(interval);
        reject(`WebSocket connection timeout: ${channel}`);
      }, 3000);
    });
  }

function connectWebSocket(channel, isMounted, attempt = 1) {
    const ws = new WebSocket(
      `${config.apiBaseUrl.replace("http", "ws")}/ws/connect?type=dashboard-${channel}&sessionId=${userId}`
    );

    ws.onopen = () => {
      console.log(`✅ WebSocket connected (${channel})`);
      socketRef.current[channel] = ws;
    };

    ws.onerror = (err) => {
      console.error(`❌ WebSocket error (${channel})`, err);
    };

    ws.onclose = () => {
      console.warn(`⚠️ WebSocket closed (${channel})`);
      socketRef.current[channel] = null;

      if (attempt <= MAX_RETRIES) {
        console.log(`🔁 Reconnecting WebSocket (${channel}), attempt ${attempt}`);
        setTimeout(() => connectWebSocket(channel, attempt + 1), RETRY_DELAY);
      } else {
        console.error(`❌ Max retries reached for WebSocket (${channel})`);
      }
    };

    ws.onmessage = (event) => {
      try {
        console.log(`📨 Message on ${channel}`);
        console.log(`Current Loop Id in Dashboard : ${currentLoopId}`)
        const raw = JSON.parse(event.data);
        if (!isMounted) return;

        if (activeTabRef.current === "replay") {
          setReplayMessages((prev) => [...prev, { ...raw, _channel: channel }]);
        } else if (activeTabRef.current === "create") {
          setRecordMessages((prev) => [...prev, { ...raw, _channel: channel }]);
        }
      } catch (err) {
        console.error(`❌ Failed to parse WS (${channel})`, err);
      }
    };
  }

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === "create") {
      setRecordMessages([]);
      setLogs([]);
    } else if (activeTab === "replay") {
      setReplayMessages([]);
      setLogs([]);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!userId) return;

    const channels = ["event", "log"];
    let isMounted = true;

    channels.forEach((channel) => {
      connectWebSocket(channel, isMounted);
    });

    return () => {
      isMounted = false;
      Object.values(socketRef.current).forEach((ws) => ws.close());
    };
  }, [userId]);

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const res = await fetch(`${config.agentServerUrl}/api/status`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
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

  const [leftWidth, setLeftWidth] = useState(null); // null initially
  const [layoutReady, setLayoutReady] = useState(false);
  const leftPanelRef = useRef(null);
  const isResizing = useRef(false);
  const startResizing = () => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleResizing);
    document.addEventListener("mouseup", stopResizing);
  };

  useEffect(() => {
    const saved = localStorage.getItem("botflows_left_panel_width");
    const initial = saved ? parseInt(saved, 10) : 400;
    setLeftWidth(initial);
    setLayoutReady(true);
  }, []);

  if (!layoutReady) return null; 

  const handleResizing = (e) => {
    if (!isResizing.current) return;
    const newWidth = Math.min(Math.max(200, e.clientX), window.innerWidth - 200);
    setLeftWidth(newWidth);
    localStorage.setItem("botflows_left_panel_width", newWidth);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResizing);
    document.removeEventListener("mouseup", stopResizing);
  };
  
  return (
    <div className="h-full flex flex-col bg-gray-50 text-gray-800">
      {/* Tabs (static top, not clipped) */}
      <div className="shrink-0">
        <div className="bg-white border-b px-6 py-2">
          <nav className="flex space-x-2" aria-label="Tabs">
            {["create", "replay", "config"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
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

      {/* Main workspace (scrollable) */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "create" && (
          <CreatePanel
            steps={steps}
            setSteps={setSteps}
            addStep={addStep}
            clearSteps={clearSteps}
            updateStepWithImprovedSelector={updateStepWithImprovedSelector}
            pickedTarget={pickedTarget}
            setPickedTarget={setPickedTarget}
            agentStatus={agentStatus}
            logs={logs}
            setLogs={setLogs}
            recordMessages={recordMessages}
            setRecordMessages={setRecordMessages}
            ensureWebSocket={ensureWebSocket}
            currentLoopId={currentLoopId}
            setCurrentLoopId={setCurrentLoopId}
            leftWidth={leftWidth}
            leftPanelRef={leftPanelRef}
            startResizing={startResizing}
          />
        )}

        {activeTab === "replay" && (
          <main className="relative flex p-6 overflow-auto h-full">
            {/* Agent not running overlay */}

            <ReplayPanel 
              onEnsureWebSocket={ensureWebSocket}
              isMounted={true}
              agentStatus={agentStatus} 
              logs={logs} 
              setLogs={setLogs} 
              rawMessages={replayMessages} 
              setRawMessages={setReplayMessages} 
            />
          </main>
        )}

        {activeTab === "config" && <ConfigurePanel />}

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Confirm Tab Switch</h2>
              <p className="mb-4">You are currently recording. Switching tabs will stop the recording. Do you want to proceed?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelTabSwitch}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTabSwitch}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Yes, Stop Recording
                </button>
              </div>
            </div>
          </div>
        )}      
        <DashboardTour run={runTour} setRun={setRunTour} />
      </div>
    </div>
      
  );

}
