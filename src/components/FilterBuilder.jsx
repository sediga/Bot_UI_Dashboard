import { useEffect, useMemo, useState } from "react";

/** UI label ↔ canonical token maps (what your player expects) */
const TEXT_OPS = [
  { ui: "contains",           tok: "contains" },
  { ui: "does not contain",   tok: "does not contain" },
  { ui: "equals",             tok: "equals" },
  { ui: "does not equal",     tok: "does not equal" },
  { ui: "starts with",        tok: "starts with" },
  { ui: "does not start with",tok: "does not start with" },
  { ui: "ends with",          tok: "ends with" },
  { ui: "does not end with",  tok: "does not end with" },
  { ui: "regex",              tok: "regex" },
];

const COMP_OPS = [
  { ui: ">",  tok: "gt"  },
  { ui: "<",  tok: "lt"  },
  { ui: ">=", tok: "gte" },
  { ui: "<=", tok: "lte" },
  { ui: "=",  tok: "equals" },
  { ui: "!=", tok: "notEquals" },
];

const BOOL_OPS = [
  { ui: "is true",  tok: "isTrue"  },
  { ui: "is false", tok: "isFalse" },
];

const OPS_BY_TYPE = {
  text: TEXT_OPS,
  number: COMP_OPS,
  date: COMP_OPS,
  boolean: BOOL_OPS,
  img: BOOL_OPS,
};

/** Normalize a single column (string or object) -> { value, label, type, key, variables? } */
function normalizeCol(c) {
  if (typeof c === "string") {
    return { value: c, label: c, type: "text", key: c };
  }
  if (c && typeof c === "object") {
    const headerVal =
      typeof c.header === "string"
        ? c.header
        : (c.header?.header ||
           c.header?.name ||
           c.header?.key  ||
           c.name ||
           c.key  ||
           c.field ||
           "");
    const value = String(headerVal || "");
    return {
      value,
      label: value,
      type: c.type || "text",
      key: String(c.key || value || Math.random()),
      variables: Array.isArray(c.variables) ? c.variables : undefined,
    };
  }
  return { value: "", label: "", type: "text", key: Math.random().toString(36) };
}

/** Convert UI operator label -> canonical token */
function toToken(ui, type) {
  const list = OPS_BY_TYPE[type] || TEXT_OPS;
  return (list.find(o => o.ui === ui)?.tok) || ui;
}
/** Convert token -> UI label (for rendering existing filters) */
function toUI(tok, type) {
  const list = OPS_BY_TYPE[type] || TEXT_OPS;
  return (list.find(o => o.tok === tok)?.ui) || tok;
}

export default function FilterBuilder({ columns = [], filters = [], onFiltersChange }) {
  const normColumns = useMemo(() => columns.map(normalizeCol).filter(c => c.value), [columns]);

  const [localFilters, setLocalFilters] = useState(
    filters && filters.length
      ? filters
      : [{ column: "", operator: "", value: "", variable: "" }]
  );

  // Keep local state in sync with prop, not just by length
  useEffect(() => {
    const a = JSON.stringify(filters || []);
    const b = JSON.stringify(localFilters || []);
    if (a !== b) {
      setLocalFilters(filters && filters.length
        ? filters
        : [{ column: "", operator: "", value: "", variable: "" }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const pushUp = (next) => onFiltersChange?.(next);

  const updateFilter = (idx, patch) => {
    const next = localFilters.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    setLocalFilters(next);
    pushUp(next);
  };

  const addFilterRow = () => {
    const next = [...localFilters, { column: "", operator: "", value: "", variable: "" }];
    setLocalFilters(next);
    pushUp(next);
  };

  const removeFilterRow = (idx) => {
    const next = localFilters.filter((_, i) => i !== idx);
    setLocalFilters(next);
    pushUp(next);
  };

  return (
    <div>
      {localFilters.map((filter, idx) => {
        // find column meta (if user opened an old step, the column may be missing)
        const colMeta = normColumns.find(c => c.value === filter.column) || null;

        // raw type from meta; if user picked a variable within "text_with_date" treat as 'date'
        const rawType = colMeta?.type || "text";
        const colType = filter.variable ? "date" : rawType;

        const ops = OPS_BY_TYPE[colType] || TEXT_OPS;
        // show UI label for existing canonical token
        const operatorUI = filter.operator ? toUI(filter.operator, colType) : "";

        return (
          <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mb-2 items-center">
            {/* Column selector */}
            <select
              className="border rounded px-2 py-1 w-full"
              value={colMeta ? filter.column : ""}   // blank if missing
              onChange={(e) => {
                const selected = e.target.value;
                const meta = normColumns.find(c => c.value === selected);
                updateFilter(idx, {
                  column: selected,
                  operator: "",   // reset until they choose
                  value: "",
                  variable: meta?.variables?.[0]?.name || "",
                });
              }}
            >
              {!colMeta && filter.column ? (
                <option value="">
                  (missing) {String(filter.column)}
                </option>
              ) : (
                <option value="">Select column</option>
              )}
              {normColumns.map(c => (
                <option key={c.key} value={c.value}>
                  {c.label}{c.type ? ` (${c.type})` : ""}
                </option>
              ))}
            </select>

            {/* Variable selector for text_with_date */}
            {rawType === "text_with_date" && (colMeta?.variables?.length > 0) && (
              <select
                className="border rounded px-2 py-1 w-full"
                value={filter.variable || ""}
                onChange={(e) => {
                  const variable = e.target.value;
                  // when switching to date variable, reset operator to a date op if prior is incompatible
                  const nextType = variable ? "date" : rawType;
                  const currentUI = operatorUI;
                  const valid = (OPS_BY_TYPE[nextType] || TEXT_OPS).some(o => o.ui === currentUI);
                  updateFilter(idx, { variable, operator: valid ? toToken(currentUI, nextType) : "" });
                }}
              >
                <option value="">-- as text --</option>
                {colMeta.variables.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name}{v.format ? ` (${v.format})` : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Operator */}
            <select
              className="border rounded px-2 py-1 w-full"
              value={operatorUI}
              onChange={(e) => updateFilter(idx, { operator: toToken(e.target.value, colType) })}
              disabled={!filter.column}
            >
              <option value="">Select operator</option>
              {ops.map(o => (
                <option key={o.tok} value={o.ui}>
                  {colType === "img"
                    ? (o.tok === "isTrue" ? "Has Image" : "No Image")
                    : o.ui}
                </option>
              ))}
            </select>

            {/* Value input */}
            {!["boolean", "img"].includes(colType) && (
              <input
                type="text"
                className="border rounded px-2 py-1 w-full"
                placeholder="Value"
                value={filter.value || ""}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                disabled={!filter.operator}
              />
            )}

            {/* Remove */}
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

      <button className="mt-2 bg-blue-600 text-white px-3 py-1 rounded" onClick={addFilterRow} type="button">
        + Add Filter
      </button>
    </div>
  );
}
