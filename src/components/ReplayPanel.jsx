import { useState, useEffect } from "react";
import config from "../config"

export default function ReplayPanel() {
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [log, setLog] = useState("");

  useEffect(() => {
    const fetchSavedFlows = async () => {
      try {
        const headers = {
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

    try {
      const headers = {
        "Content-Type": "application/json",
        "x-api-key": `${config.apiKey}` // Load from env later
      };
        const apiRes = await fetch(`${config.apiBaseUrl}/api/flows/load/${encodeURIComponent(selectedFlow)}`  , {
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
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-indigo-700">Replay Flow</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Select Flow</label>
        <select
          value={selectedFlow}
          onChange={(e) => setSelectedFlow(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        >
          <option value="">-- Choose saved flow --</option>
          {savedFlows.map((filename) => (
            <option key={filename} value={filename}>
              {filename.replace(".json", "")}
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

      {log && (
        <div className="mt-4 bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">
          {log}
        </div>
      )}
    </section>
  );
}
