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
import RunsPanel from "./RunsPanel";


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
  const eventBusRef = useRef(new EventTarget()); // 🔹 new

  const [runTour, setRunTour] = useState(() => {
    return localStorage.getItem("botflows_tour_skipped") !== "true";
  });

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

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
      clearSteps();               // clear steps when switching tabs
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
  const wantOpenRef = useRef({});   // { [channel]: boolean }
  const recvSeqRef = useRef(0);
  // function withConnectLock(channel, fn) {
  //   const prev = CONNECT_LOCKS[channel] || Promise.resolve();
  //   const next = prev.then(() => fn());
  //   CONNECT_LOCKS[channel] = next.catch(() => {}); // keep chain alive
  //   return next;
  // }

  function startHeartbeat(channel) {
    const entry = socketRef.current[channel];
    if (!entry) return;

    // Clear old timers
    clearHeartbeat(channel);

    // App-level ping every 25s
    entry.timers = entry.timers || {};
    entry.timers.ping = setInterval(() => {
      try {
        entry.ws?.readyState === WebSocket.OPEN &&
          entry.ws.send(JSON.stringify({ type: "ping" }));
      } catch {}
    }, 25000);

    // Idle watchdog: no inbound for 60s -> force reconnect
    entry.lastSeen = Date.now();
    entry.timers.watchdog = setInterval(() => {
      const idleMs = Date.now() - (entry.lastSeen || 0);
      if (idleMs > 60000 && entry.ws?.readyState === WebSocket.OPEN) {
        try { entry.ws.close(4000, "idle-timeout"); } catch {}
      }
    }, 10000);
  }

  function clearHeartbeat(channel) {
    const entry = socketRef.current[channel];
    if (!entry || !entry.timers) return;
    Object.values(entry.timers).forEach(t => clearInterval(t));
    entry.timers = {};
  }

  // Idempotent: ensure a socket exists and is connected; no promises, no locks.
  function ensureWebSocket(channel) {
    wantOpenRef.current[channel] = true; // we want this channel up
    const entry = socketRef.current[channel];
    const rs = entry?.ws?.readyState;
    // if OPEN or CONNECTING (0=CONNECTING, 1=OPEN), don’t start another
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    if (entry?.connecting) return; // already dialing
    connectWebSocket(channel);
  }

  const NOISE_TYPES = new Set(["ping", "pong", "heartbeat", "ready"]);

  function isNoiseEvent(raw) {
    const t = (raw && (raw.type || raw.kind || raw.event)) || "";
    return NOISE_TYPES.has(String(t).toLowerCase());
  }

  function isNoiseLog(raw) {
    if (!raw) return false;
    // object form
    const t = (raw.type || raw.kind || raw.event || "").toLowerCase();
    if (NOISE_TYPES.has(t)) return true;
    // string/text form
    const msg =
      raw.message ?? raw.msg ?? raw.text ?? raw.payload?.message ?? raw.payload?.text;
    if (typeof msg === "string" && /^(ping|pong|heartbeat|ready)\b/i.test(msg)) return true;
    if (typeof raw === "string" && /^(ping|pong|heartbeat|ready)\b/i.test(raw)) return true;
    return false;
  }

  function normalizeLog(raw) {
    if (raw == null) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
    const msg =
      raw.message ?? raw.msg ?? raw.text ?? raw.payload?.message ?? raw.payload?.text;
    if (msg) return String(msg);
    try { return JSON.stringify(raw); } catch { return "[object]"; }
  }

  function connectWebSocket(channel) {
    if (!userId) return;

    // prevent parallel connects
    // if caller doesn’t currently want this channel, don’t connect
    if (!wantOpenRef.current[channel]) return;
    const cur = socketRef.current[channel] || {};
    if (cur.connecting) return; // already dialing
    const rs = cur.ws?.readyState;
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    // mark connecting and bump generation
    const gen = (cur.gen || 0) + 1;
    socketRef.current[channel] = { ...cur, connecting: true, gen };

    const url = `${config.apiBaseUrl.replace("http", "ws")}/ws/connect?type=dashboard-${channel}&sessionId=${userId}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      const e = socketRef.current[channel];
      if (!e || e.gen !== gen) { try { ws.close(); } catch {} return; } // stale
      e.ws = ws;
      e.connecting = false;
      startHeartbeat(channel);
      console.log(`WebSocket connected: ${channel}`);
    };

    ws.onmessage = (event) => {
      const entry = socketRef.current[channel];
      if (!entry || entry.gen !== gen) return; // ignore stale socket
      entry.lastSeen = Date.now();
      try {
        // tolerant parsing: events must be JSON; logs may be plain text
        let raw;
        try { raw = JSON.parse(event.data); }
        catch { raw = (channel === "log") ? String(event.data) : null; }
        if (!raw) return;
        if (typeof raw === "object") raw._recv = ++recvSeqRef.current; // stable tiebreaker
         // Idempotent: ensure a socket exists and is connected; no promises, no locks.
         if (channel === "event") {
          if (isNoiseEvent(raw) && !raw.action && !raw.eventId) return;
           // Always broadcast events on the bus (lossless for StepBuilder)
           eventBusRef.current.dispatchEvent(
             new CustomEvent("flowtra:msg", { detail: { channel, raw } })
           );
           // Feed ReplayPanel when on the replay tab
           if (activeTabRef.current === "replay") {
             setReplayMessages(prev => [...prev, { ...raw, _channel: channel }]);
           }
           // Note: we intentionally do NOT push event messages into recordMessages
           // to avoid races; StepBuilder should consume the bus instead.
         } else if (channel === "log") {
          if (isNoiseLog(raw)) return;
          const line = `[${new Date().toLocaleTimeString()}] ${normalizeLog(raw)}`;
          const MAX_LOGS = 2000;
          setLogs(prev => {
            const next = (prev || []).concat(line);
            return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
          });
         }
              } catch (e) {
        console.error(`Failed to parse WS (${channel})`, e);
      }
    };

    ws.onerror = (err) => {
      // browsers don’t give much detail; logging is still useful
      console.warn(`WebSocket error (${channel})`, err);
    };

    ws.onclose = (ev) => {
      const e = socketRef.current[channel];
      if (e && e.gen === gen) {
        clearHeartbeat(channel);
        // clear this socket; preserve gen to guard stale reconnects
        socketRef.current[channel] = { ...e, ws: null, connecting: false };
      } else {
        // stale; nothing to do
        return;
      }
      // only reconnect if caller *still* wants this channel and component is alive
      if (!aliveRef.current || !wantOpenRef.current[channel]) return;
      // jittered reconnect; de-dupe existing timer
      if (e?.reconnectTimer) clearTimeout(e.reconnectTimer);
      const delay = 400 + Math.random() * 800;
      const t = setTimeout(() => {
        const cur = socketRef.current[channel];
        if (!aliveRef.current || !wantOpenRef.current[channel]) return;
        // avoid overlapping dials
        if (cur?.connecting) return;
        connectWebSocket(channel);
      }, delay);
      socketRef.current[channel] = { ...(socketRef.current[channel] || {}), reconnectTimer: t };
  };
}

  // Example of handling user logout/session timeout
  useEffect(() => {
    if (!userId) return;  // Only connect WebSocket if the user is logged in

    const channels = ["event", "log"];
 
     channels.forEach((channel) => {
       ensureWebSocket(channel);
     });

    // Clean up WebSocket connections when the user logs out or the session expires
    return () => {
      // caller no longer wants channels; stop reconnect loops first
      channels.forEach((ch) => { wantOpenRef.current[ch] = false; });
      Object.values(socketRef.current).forEach((entry) => {
        if (entry?.reconnectTimer) clearTimeout(entry.reconnectTimer);
        entry?.ws?.close?.();
      });
    };
  }, [userId]);  // Trigger cleanup when userId changes (i.e., on logout)

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
            {["create", "replay", "runs", "config"].map((tab) => (
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
                {tab === "runs" && "Runs"}
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
            eventBus={eventBusRef.current}
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
        {activeTab === "runs" && (
          <main className="relative p-6 overflow-auto h-full">
            <RunsPanel />
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
