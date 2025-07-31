import { useState, useEffect } from "react";
import config from "../config"
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";
import FlowSelector from "./FlowSelector";

export default function ReplayPanel({
  onEnsureWebSocket,
  isMounted,
  agentStatus, 
  logs, 
  setLogs, 
  rawMessages, 
  setRawMessages
}) {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [log, setLog] = useState("");
  const token = localStorage.getItem("botflows_token");
  const { userId } = useAuth();
 
  useEffect(() => {
    if (!rawMessages || rawMessages.length === 0) return;

    rawMessages.forEach((raw) => {
      try {
        const channel = raw._channel; // passed from parent
        const payload = raw.payload || raw;

        if (["log", "event"].includes(channel) && ["ping", "ready"].includes(raw.type)) return;

        if (channel === "log" && raw.type === "log") {
          setLogs(prev => [...prev, payload.message]);
          return;
        }

      } catch (err) {
        console.error("Failed to process raw message:", err);
      }
    });
    setRawMessages([]);
  }, [rawMessages]);

  useEffect(() => {
    const fetchSavedFlows = async () => {
      try {
        await onEnsureWebSocket("event", isMounted);
        await onEnsureWebSocket("log", isMounted);
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-api-key": `${config.apiKey}` // Load from env later
        };
        const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, {
          headers: headers,
        });
        const data = await res.json();
        setSavedFlows(data);
      } catch (err) {
        console.error("Error fetching saved flows", err);
        setLog("Failed to fetch saved flows");
      }
    };

    fetchSavedFlows();
  }, []);

  const handleReplay = async () => {
    if (!selectedFlow) return;
    setLogs([]); 

    try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
          // "x-api-key": `${config.apiKey}` // Load from env later
        };
        const apiRes = await fetch(`${config.apiBaseUrl}/api/flows/load?path=${encodeURIComponent(selectedFlow)}`, {
          headers: headers,
        });
        const apiData = await apiRes.json();

      const res = await fetch(`${config.agentServerUrl}/api/replay`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(apiData), // adjust this key if needed
      });

      const data = await res.json();
      setLog("Replay started:\n" + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Replay failed:", err);
      setLog("Replay failed: " + err.message);
    }
  };

  return (
    <div className="relative w-full h-full px-6 max-w-screen-lg mx-auto flex flex-col space-y-6">
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

      {/* Heading */}
      <h2 className="text-xl font-semibold text-indigo-700">Replay Flow</h2>

      {/* Flow Selector */}
      <section className="bg-white shadow rounded-lg p-5 space-y-4">
        <FlowSelector
          value={selectedFlow}
          onChange={setSelectedFlow}
          label="Select Flow"
        />

        <div className="flex justify-end">
          <button
            onClick={handleReplay}
            className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm"
          >
            Replay
          </button>
        </div>
      </section>

      {/* Status Panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StatusPanel status={agentStatus} logs={logs} />
      </div>
    </div>
  );

}
