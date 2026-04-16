// components/FlowSelector.jsx
import { useState, useEffect } from "react";
import config from "../config";
import { documentKindLabel } from "../utils/flowSchema";

function normalizeDocumentType(value) {
  return String(value || "").toLowerCase() === "workflow" ? "workflow" : "flow";
}

function formatOptionLabel(flow) {
  const kind = documentKindLabel(normalizeDocumentType(flow?.type));
  const version = flow?.version != null && flow?.version !== "" ? ` v${flow.version}` : "";
  return `[${kind}] ${flow?.name || "Untitled"}${version}`;
}

export default function FlowSelector({
  value,
  onChange,
  label = "Select Flow",
  className = "",
  showLabel = true,
  fetchedFlows = null,
  placeholder = "-- Choose saved flow --",
  allowedTypes = null,
  showMeta = true,
}) {
  const [flows, setFlows] = useState([]);
  const token = localStorage.getItem("botflows_token");

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        if (Array.isArray(fetchedFlows) && fetchedFlows.length > 0) {
          setFlows(Array.isArray(fetchedFlows) ? fetchedFlows : []);
          return;
        }

        const auth = token
          ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`)
          : "";
        const res = await fetch(`${config.apiBaseUrl}/api/flows/list`, {
            headers: {
              Authorization: auth,
              "Content-Type": "application/json",
              "x-api-key": config.apiKey,
            },
        });
        if (!res.ok) {
          console.error(`Failed to load flows: HTTP ${res.status}`);
          setFlows([]);
          return;
        }
        const data = await res.json();
        setFlows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load flows:", err);
        setFlows([]);
      }
    };

    fetchFlows();
  }, [token, fetchedFlows]);

  const allowed = Array.isArray(allowedTypes) && allowedTypes.length
    ? new Set(allowedTypes.map((item) => normalizeDocumentType(item)))
    : null;
  const visibleFlows = allowed
    ? flows.filter((flow) => allowed.has(normalizeDocumentType(flow?.type)))
    : flows;
  const selectedFlow = visibleFlows.find((flow) => flow.path === value) || flows.find((flow) => flow.path === value) || null;
  const selectedType = normalizeDocumentType(selectedFlow?.type);
  const selectedVersion = selectedFlow?.version != null && selectedFlow?.version !== "" ? `v${selectedFlow.version}` : "";

  return (
    <div className={className}>
      {showLabel && <label className="block font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded text-sm"
      >
        <option value="">{placeholder}</option>
        {visibleFlows.map((flow) => (
          <option key={flow.path} value={flow.path}>
            {formatOptionLabel(flow)}
          </option>
        ))}
      </select>
      {showMeta && selectedFlow && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{documentKindLabel(selectedType)}</span>
          {selectedVersion ? ` | ${selectedVersion}` : ""}
          {selectedFlow.path ? ` | ${selectedFlow.path}` : ""}
        </div>
      )}
    </div>
  );
}
