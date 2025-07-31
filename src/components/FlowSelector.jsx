// components/FlowSelector.jsx
import { useState, useEffect } from "react";
import config from "../config";

export default function FlowSelector({ value, onChange, label = "Select Flow", className = "", showLabel = true, fetchedFlows = []}) {
  const [flows, setFlows] = useState([]);
  const token = localStorage.getItem("botflows_token");

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        if(fetchedFlows && fetchedFlows.length > 0)
        {
            setFlows(fetchedFlows)
        }
        else
        {
            const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
            },
            });
            const data = await res.json();
            setFlows(data);
        }
      } catch (err) {
        console.error("Failed to load flows:", err);
        setFlows([]);
      }
    };

    fetchFlows();
  }, []);

  return (
    <div className={className}>
      {showLabel && <label className="block font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded text-sm"
      >
        <option value="">-- Choose saved flow --</option>
        {flows.map((flow) => (
          <option key={flow.path} value={flow.path}>
            {flow.name}
          </option>
        ))}
      </select>
    </div>
  );
}
