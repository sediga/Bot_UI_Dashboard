// components/TokenPicker.jsx
import { useEffect, useRef, useState } from "react";

export default function TokenPicker({ columns = [], onPick, sampleRow }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = !q
    ? columns
    : columns.filter((c) => (c || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="px-2 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        onClick={() => setOpen((v) => !v)}
        disabled={!columns.length}
        title={!columns.length ? "No columns available (add a Data-Driven Loop source)" : "Insert column token"}
      >
        Map
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b">
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              placeholder="Search columns…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-auto text-sm">
            {filtered.length ? (
              filtered.map((col) => {
                const preview = sampleRow ? String(sampleRow[col] ?? "") : "";
                return (
                  <li key={col}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => {
                        onPick(`{{row.${col}}}`);
                        setOpen(false);
                      }}
                    >
                      <div className="font-medium text-gray-900">{col}</div>
                      {preview && (
                        <div className="text-[11px] text-gray-500 truncate">
                          e.g. {preview}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-4 text-gray-500 text-xs">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
