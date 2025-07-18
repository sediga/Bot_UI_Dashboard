import { useState, useEffect } from "react";
import config from "../config"
import StatusPanel from "./StatusPanel";
import { useAuth } from "../contexts/AuthContext";

export default function ReplayPanel({
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
          "Content-Type": "application/json",
          "x-api-key": `${config.apiKey}` // Load from env later
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
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <h2 className="text-lg font-semibold text-indigo-700">Replay Flow</h2>

      {/* Flow Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Select Flow</label>
        <select
          value={selectedFlow}
          onChange={(e) => setSelectedFlow(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          <option value="">-- Choose saved flow --</option>
          {savedFlows.map((flow) => (
            <option key={flow.path} value={flow.path}>
              {flow.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleReplay}
          className="px-4 py-2 bg-purple-600 text-white rounded shadow text-sm"
        >
          Replay
        </button>
      </div>

      {/* Status Panel fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <StatusPanel status={agentStatus} logs={logs} />
      </div>
    </div>
  );

}
