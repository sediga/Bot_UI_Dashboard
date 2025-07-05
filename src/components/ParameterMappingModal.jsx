import { useState, useEffect } from "react";

export default function ParameterMappingModal({ show, onClose, onSave, columns = [], defaultValue = "" }) {
  const [mode, setMode] = useState("dynamic");
  const [staticValue, setStaticValue] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");

  useEffect(() => {
    setStaticValue(defaultValue);
    if (defaultValue?.includes("{{") && defaultValue?.includes("}}")) {
      const col = defaultValue.replace("{{", "").replace("}}", "");
      setSelectedColumn(col);
      setMode("dynamic");
    } else if (defaultValue) {
      setMode("static");
    } else {
      setSelectedColumn(columns[0] || "");
      setMode("dynamic");
    }
  }, [defaultValue, columns, show]);

  const handleSave = () => {
    const value = mode === "static" ? staticValue : `{{${selectedColumn}}}`;
    onSave(value);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Map Input Value</h2>

        <div className="space-y-4">
          {/* Static Mode */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "static"}
                onChange={() => setMode("static")}
              />
              <span>Static value</span>
            </label>
            {mode === "static" && (
              <input
                type="text"
                className="w-full border px-3 py-2 mt-2 rounded"
                value={staticValue}
                onChange={(e) => setStaticValue(e.target.value)}
              />
            )}
          </div>

          {/* Dynamic Mode */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "dynamic"}
                onChange={() => setMode("dynamic")}
              />
              <span>Dynamic column value</span>
            </label>
            {mode === "dynamic" && (
              <select
                className="w-full border px-3 py-2 mt-2 rounded"
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                <option value="">-- Select column --</option>
                {columns.map((col, idx) => (
                  <option key={idx} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
