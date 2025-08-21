import { useEffect } from "react";

export default function ColumnContextMenu({ open, x, y, columns, onSelect, onClose }) {
  if (!open) return null;

  // keep menu inside viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const width = 240, height = Math.min(300, (columns?.length || 1) * 36 + 16);
  const left = Math.min(x, vw - width - 8);
  const top  = Math.min(y, vh - height - 8);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" onMouseDown={onClose}>
      <div
        className="absolute bg-white border border-gray-200 rounded-md shadow-lg w-60 max-h-72 overflow-auto py-1"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()} // keep clicks inside
      >
        {columns && columns.length ? (
          columns.map((col) => (
            <button
              key={col}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              onClick={() => onSelect(col)}
            >
              {col}
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-gray-500">No columns</div>
        )}
      </div>
    </div>
  );
}
