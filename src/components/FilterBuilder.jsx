import { useState, useEffect } from "react";

// Operators by data type
const OPERATORS_BY_TYPE = {
  text: [
    "contains",
    "does not contain",
    "equals",
    "does not equal",
    "starts with",
    "does not start with",
    "ends with",
    "does not end with",
    "regex",
  ],
  number: [">", "<", ">=", "<=", "=", "!="],
  date: [">", "<", ">=", "<=", "=", "!="],
  boolean: ["is true", "is false"],
  img: ["is true", "is false"],
};

export default function FilterBuilder({ columns = [], filters = [], onFiltersChange }) {
  const [localFilters, setLocalFilters] = useState(
    filters.length ? filters : [{ column: "", operator: "", value: "", variable: "" }]
  );

  useEffect(() => {
    if (filters.length !== localFilters.length) {
      setLocalFilters(filters.length ? filters : [{ column: "", operator: "", value: "", variable: "" }]);
    }
  }, [filters]);

  const updateFilter = (index, updated) => {
    const newFilters = [...localFilters];
    newFilters[index] = { ...newFilters[index], ...updated };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const addFilterRow = () => {
    setLocalFilters([...localFilters, { column: "", operator: "", value: "", variable: "" }]);
  };

  const removeFilterRow = (index) => {
    const newFilters = localFilters.filter((_, i) => i !== index);
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <div>
      {localFilters.map((filter, idx) => {
        const columnMeta = columns.find((c) => c.header === filter.column) || {};
        const rawType = columnMeta.type || "text";
        const colType = filter.variable ? "date" : rawType;
        const operators = OPERATORS_BY_TYPE[colType] || OPERATORS_BY_TYPE.text;

        return (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-2 items-center">
            {/* Column selector */}
            <select
              className="border rounded px-2 py-1 w-full"
              value={filter.column}
              onChange={(e) => {
                const selectedColumn = e.target.value;
                const selectedColMeta = columns.find((c) => c.header === selectedColumn);
                updateFilter(idx, {
                  column: selectedColumn,
                  operator: "",
                  value: "",
                  variable: selectedColMeta?.variables?.[0]?.name || undefined,
                });
              }}
            >
              <option value="">Select column</option>
              {columns.map((col) => (
                <option key={col.header} value={col.header}>
                  {col.header} ({col.type})
                </option>
              ))}
            </select>

            {/* Variable selector (only for text_with_date) */}
            {rawType === "text_with_date" && columnMeta.variables?.length > 0 && (
              <select
                className="border rounded px-2 py-1 w-full"
                value={filter.variable}
                onChange={(e) => updateFilter(idx, { variable: e.target.value })}
              >
                <option value="">-- as text --</option>
                {columnMeta.variables.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.format})
                  </option>
                ))}
              </select>
            )}

            {/* Operator */}
            <select
              className="border rounded px-2 py-1 w-full"
              value={filter.operator}
              onChange={(e) => updateFilter(idx, { operator: e.target.value })}
              disabled={!filter.column}
            >
              <option value="">Select operator</option>
              {operators.map((op) => (
                <option key={op} value={op}>
                  {colType === "img"
                    ? op === "is true"
                      ? "Has Image"
                      : "No Image"
                    : op}
                </option>
              ))}
            </select>

            {/* Value input */}
            {!["boolean", "img"].includes(colType) && (
              <input
                type="text"
                className="border rounded px-2 py-1 w-full"
                placeholder="Value"
                value={filter.value}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                disabled={!filter.operator}
              />
            )}

            {/* Remove button */}
            {localFilters.length > 1 && (
              <div className="text-right">
                <button
                  className="text-red-600 font-bold"
                  onClick={() => removeFilterRow(idx)}
                  type="button"
                  aria-label="Remove filter row"
                >
                  &times;
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
        onClick={addFilterRow}
        type="button"
      >
        + Add Filter
      </button>
    </div>
  );
}
