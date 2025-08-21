import { useRef, useState } from "react";
import ColumnContextMenu from "./ColumnContextMenu";

export default function ValueWithMapper({ label, value, onChange, columns }) {
  const inputRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  function insertAtCursor(token) {
    const el = inputRef.current;
    if (!el) return onChange((value || "") + token);
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = (value || "").slice(0, start);
    const after = (value || "").slice(end);
    const next = before + token + after;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function openMenuAtEvent(e) {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  }

  function handlePick(col) {
    insertAtCursor(`{{row.${col}}}`);
    setMenuOpen(false);
  }

  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}

      <div className="flex items-start gap-2">
        {/* Left click or right click both open the menu near cursor */}
        <input
          ref={inputRef}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Type or insert… e.g. {{row.Column}} or {{secret:agent/key}}'}
          onContextMenu={openMenuAtEvent}      // right-click
        />
        <button
          type="button"
          className="px-2 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
          onClick={openMenuAtEvent}            // regular click
        >
          Map
        </button>
      </div>

      <div className="text-[11px] text-gray-500">
        Tip: inside loops, use <code>{'{{row.Column}}'}</code>. Secrets still work:
        <code className="ml-1">{'{{secret:agent/yourKey}}'}</code>
      </div>

      <ColumnContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        columns={columns || []}
        onSelect={handlePick}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
