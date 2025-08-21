import { useEffect, useMemo, useRef, useState } from "react";
import config from "../../config";

export default function SecretMapperModal({ open, onClose, eventId, suggestedName, onMapped }) {
  const [name, setName] = useState("");
  const [agentList, setAgentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setName(suggestedName || "");
    setQuery("");
    setLoadErr("");
    (async () => {
      try {
        const res = await fetch(`${config.agentServerUrl}/api/secrets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAgentList(Array.isArray(data) ? data : []);
      } catch (e) {
        setAgentList([]);
        setLoadErr("Couldn’t load secrets from agent.");
      }
    })();
  }, [open, suggestedName]);

  useEffect(() => {
    if (!open) return;
    // focus name input on open
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const knownNames = useMemo(() => new Set(agentList.map(s => s.name)), [agentList]);

  async function hideOverlay() {
    try { await fetch(`${config.agentServerUrl}/api/overlay/hide`, { method: "POST" }); } catch {}
  }

  function valid(n) {
    return /^[A-Za-z0-9_\-:.]{1,64}$/.test(n);
  }

  async function onMap() {
    const trimmed = (name || "").trim();
    if (!eventId || !trimmed || !valid(trimmed)) return;

    if (!knownNames.has(trimmed)) {
      const ok = window.confirm(
        `"${trimmed}" is not in Agent secrets yet.\nMap anyway? You can add it later in Agent Settings.`
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      onMapped?.("agent", trimmed); // reflect locally
      await hideOverlay();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agentList;
    return agentList.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.type || "").toLowerCase().includes(q)
    );
  }, [agentList, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Enter") onMap();
        if (e.key === "Escape") { hideOverlay(); onClose(); }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-map-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6 animate-[fadeIn_.15s_ease]">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-600">
              <path d="M12 1a5 5 0 00-5 5v2H6a3 3 0 00-3 3v7a3 3 0 003 3h12a3 3 0 003-3v-7a3 3 0 00-3-3h-1V6a5 5 0 00-5-5zm-3 7V6a3 3 0 116 0v2H9z" />
            </svg>
          </div>
          <div>
            <h3 id="secret-map-title" className="text-lg font-semibold">Map Sensitive Input</h3>
            <p className="text-sm text-neutral-600">
              Select an existing secret or type a new name (you can add it later in Agent Settings).
            </p>
          </div>
        </div>

        {/* Existing secrets */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            Existing secret
          </label>

          {/* Optional search (only helpful when list is long) */}
          <select
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          >
            <option value="">— Select —</option>
            {filtered.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}{s.type ? ` (${s.type})` : ""}
              </option>
            ))}
          </select>

          {/* Loading / error / empty */}
          {loadErr && (
            <p className="text-sm text-red-600">{loadErr}</p>
          )}
          {!loadErr && !filtered.length && (
            <p className="text-sm text-neutral-500">No secrets found.</p>
          )}
        </div>

        {/* New name */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-neutral-700">Or new name</label>
            {suggestedName && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setName(suggestedName)}
              >
                Use suggested: <code className="font-mono">{suggestedName}</code>
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="new_secret_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Allowed: letters, numbers, <code className="px-1 bg-neutral-100 rounded">_ - : .</code>, up to 64 chars.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            onClick={async () => { await hideOverlay(); onClose(); }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            disabled={loading || !eventId || !valid((name || "").trim())}
            onClick={onMap}
            title={!valid((name || "").trim()) ? "Use letters, numbers, _ - : . (max 64)" : ""}
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            )}
            {loading ? "Mapping…" : "Map to Secret"}
          </button>
        </div>
      </div>
    </div>
  );
}
