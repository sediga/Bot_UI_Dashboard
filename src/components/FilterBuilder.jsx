import { useState, useEffect } from "react";

// Operators by data type
const OPERATORS_BY_TYPE = {
  string: ["contains", "equals", "starts with", "ends with", "regex"],
  number: [">", "<", ">=", "<=", "=", "!="],
  date: [">", "<", ">=", "<=", "=", "!="],
  boolean: ["is true", "is false"],
};

export default function FilterBuilder({ columns = [], filters = [], onFiltersChange }) {
  // Initialize filters with at least one row
  const [localFilters, setLocalFilters] = useState(
    filters.length ? filters : [{ column: "", operator: "", value: "" }]
  );

  useEffect(() => {
    // Sync with external filters changes
    if (filters.length !== localFilters.length) {
      setLocalFilters(filters.length ? filters : [{ column: "", operator: "", value: "" }]);
    }
  }, [filters]);

  const updateFilter = (index, updatedFilter) => {
    const newFilters = [...localFilters];
    newFilters[index] = updatedFilter;
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const addFilterRow = () => {
    setLocalFilters([...localFilters, { column: "", operator: "", value: "" }]);
  };

  const removeFilterRow = (index) => {
    const newFilters = localFilters.filter((_, i) => i !== index);
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <div>
      {localFilters.map((filter, idx) => {
        // Find type of selected column, default to string
        const colType = columns.find((c) => c.header === filter.column)?.type || "string";
        const operators = OPERATORS_BY_TYPE[colType] || OPERATORS_BY_TYPE["string"];

        return (
          <div key={idx} className="flex items-center gap-2 mb-2">
            {/* Column select */}
            <select
              className="border rounded px-2 py-1"
              value={filter.column}
              onChange={(e) =>
                updateFilter(idx, { column: e.target.value, operator: "", value: "" })
              }
            >
              <option value="">Select column</option>
              {columns.map((col) => (
                <option key={col.header} value={col.header}>
                  {col.header} ({col.type})
                </option>
              ))}
            </select>

            {/* Operator select */}
            <select
              className="border rounded px-2 py-1"
              value={filter.operator}
              onChange={(e) => updateFilter(idx, { ...filter, operator: e.target.value })}
              disabled={!filter.column}
            >
              <option value="">Select operator</option>
              {operators.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {/* Value input, hide for booleans */}
            {colType !== "boolean" && (
              <input
                type="text"
                className="border rounded px-2 py-1 flex-grow"
                placeholder="Value"
                value={filter.value}
                onChange={(e) => updateFilter(idx, { ...filter, value: e.target.value })}
                disabled={!filter.operator}
              />
            )}

            {/* Remove button if more than 1 filter */}
            {localFilters.length > 1 && (
              <button
                className="text-red-600 font-bold px-2"
                onClick={() => removeFilterRow(idx)}
                type="button"
                aria-label="Remove filter row"
              >
                &times;
              </button>
            )}
          </div>
        );
      })}

      {/* Add filter row button */}
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
