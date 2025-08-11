import { useState, useEffect } from "react";
import config from "../config";

export default function SecretMapperModal({ open, onClose, eventId, suggestedName, onMapped }) {
  const [name, setName] = useState("");
  const [agentList, setAgentList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(suggestedName || "");
    (async () => {
      try {
        const res = await fetch(`${config.agentServerUrl}/api/secrets`);
        const data = await res.json();
        setAgentList(Array.isArray(data) ? data : []);
      } catch {
        setAgentList([]);
      }
    })();
  }, [open, suggestedName]);

  const knownNames = new Set(agentList.map(s => s.name));

  async function hideOverlay() {
    try { await fetch(`${config.agentServerUrl}/api/overlay/hide`, { method: "POST" }); } catch {}
  }

  function valid(name) {
    return /^[A-Za-z0-9_\-:.]{1,64}$/.test(name); // tweak if you like
  }

  async function onMap() {
    const trimmed = name.trim();
    if (!eventId || !trimmed || !valid(trimmed)) return;

    if (!knownNames.has(trimmed)) {
      const ok = window.confirm(`"${trimmed}" is not in Agent secrets yet.\nMap anyway? You can add it later in Agent Settings.`);
      if (!ok) return;
    }

    setLoading(true);
    try {
      // No server mapping — we just reflect locally:
      onMapped?.("agent", trimmed);
      await hideOverlay();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onKeyDown={(e)=>{
      if (e.key === "Enter") onMap();
      if (e.key === "Escape") { hideOverlay(); onClose(); }
    }}>
      <div className="bg-white rounded-xl shadow p-4 w-[420px] space-y-3">
        <h3 className="font-semibold text-lg">Map Sensitive Input</h3>

        <label className="text-sm text-gray-600">Existing secret</label>
        <select
          className="border rounded p-2 w-full"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        >
          <option value="">— Select —</option>
          {agentList.map(s => (
            <option key={s.name} value={s.name}>{s.name} ({s.type})</option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          or type a new name (you can add it later in Agent Settings)
        </div>
        <input
          className="border rounded p-2 w-full"
          placeholder="new_secret_name"
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />

        <div className="flex gap-2 justify-end pt-2">
          <button
            className="px-3 py-2 rounded bg-gray-200"
            onClick={async ()=>{
              await hideOverlay();
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={loading || !eventId || !valid(name.trim())}
            onClick={onMap}
            title={!valid(name.trim()) ? "Use letters, numbers, _ - : . (max 64)" : ""}
          >
            {loading ? "Mapping..." : "Map to Secret"}
          </button>
        </div>
      </div>
    </div>
  );
}
