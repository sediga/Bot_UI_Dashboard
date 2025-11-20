// src/components/smartsteps/GridExtractWizard.jsx
import { useEffect, useMemo, useState } from "react";
import config from "../../config";
import FilterBuilder from "../FilterBuilder";

function headerText(h) {
  if (typeof h === "string") return h;
  return h?.header || h?.name || h?.key || h?.field || "";
}

export default function GridExtractWizard({
  mode = "create",                 // "create" | "edit"
  initial = null,                  // { stepName, gridMeta:{gridSelector,rowSelector,columnHeaders?,columnMappings?}, selectedColumns, filters }
  pickedTarget,                    // used when editing and re-picking
  onCreate,                        // (payload) => void
  onCancel,
}) {
  const [gridMeta, setGridMeta] = useState(initial?.gridMeta || null);
  const [stepName, setStepName] = useState(initial?.stepName || "");
  const [selectedColumns, setSelectedColumns] = useState(initial?.selectedColumns || []);
  const [filters, setFilters] = useState(initial?.filters || []);
  const [datasetId, setDatasetId] = useState(initial?.datasetId || "");
  // --- target picking (edit only) -------------------------------------------
  const [isPicking, setIsPicking] = useState(false);

  const startPick = async () => {
    setIsPicking(true);
    await fetch(`${config.agentServerUrl}/api/target-pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "start" }),
    });
  };

  // When user clicks a new grid in the page (edit flow), refresh like first time:
  useEffect(() => {
    if (!isPicking) return;
    if (pickedTarget?.type === "targetPicked") {
      setIsPicking(false);
      const meta = pickedTarget.metadata || {};
      // normalize meta shape we use downstream
      const normalized = {
        gridSelector: meta.gridSelector,
        rowSelector: meta.rowSelector || (meta.itemSelector ? `${meta.gridSelector} ${meta.itemSelector}` : undefined),
        columnHeaders: meta.columnHeaders,   // [{ header, type? }] if the agent provides types
        columnMappings: meta.columnMappings, // optional richer info from agent
      };
      setGridMeta(normalized);
      // reset selections/filters when target changes
      setSelectedColumns([]);
      setFilters([]);
    }
  }, [pickedTarget, isPicking]);

  useEffect(() => {
    return () => {
      // on unmount, ensure pick mode is closed
      if (isPicking) fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
    };
  }, [isPicking]);

  // --- columns for UI (ensure correct types) --------------------------------
  // Prefer saved mapping types, then typedColumns, then plain headers as text.
  const columnsForFilters = useMemo(() => {
    const cm = (gridMeta?.columnMappings || []);
    const mapByHeader = new Map(
      cm.map(m => {
        const h = headerText(m.header);
        return [h, m];
      })
    );

    const headers =
      (gridMeta?.columnHeaders && gridMeta.columnHeaders.length
        ? gridMeta.columnHeaders
        : cm.length
          ? cm.map(m => ({ header: headerText(m.header), type: m.type }))
          : []);

    // if still nothing, keep it empty (user hasn’t picked yet)
    return headers.map(h => {
      const name = headerText(h);
      const m = mapByHeader.get(name);
      return {
        header: name,
        type: (m?.type) || (h?.type) || "text",   // this fixes npi_type -> img
      };
    });
  }, [gridMeta]);

  // Select-all checkbox
  const allSelected = selectedColumns.length > 0
    && columnsForFilters.every(c => selectedColumns.includes(c.header));
  const toggleAll = (checked) => {
    setSelectedColumns(checked ? columnsForFilters.map(c => c.header) : []);
  };
  const toggleOne = (name) => {
    setSelectedColumns(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // --- Save -----------------------------------------------------------------
const handleSave = async () => {
  if (!gridMeta?.gridSelector) return;

  const gridSelector = gridMeta.gridSelector;
  const rowSelector =
    gridMeta.rowSelector || `${gridSelector} div[role='row']`;

  // helpers
  const original = gridMeta?.columnMappings || [];
  const nameOf = (h) =>
    typeof h === "string"
      ? h
      : (h?.header || h?.name || h?.key || h?.field || "");

  const originalByHeader = new Map(original.map((m) => [nameOf(m.header), m]));
  const originalOrder     = original.map((m) => nameOf(m.header));

  // if you computed types for filters, reuse them; otherwise default to "text"
  const typeByHeader = new Map(
    (columnsForFilters || []).map((c) => [c.header, c.type || "text"])
  );

  // ✅ Save headers in object form so StepList sees header.header
  const columnMappings = selectedColumns.map((colName) => {
    const existing = originalByHeader.get(colName);
    const type     = typeByHeader.get(colName) || existing?.type || "text";
    const index    =
      existing?.index != null ? existing.index : Math.max(0, originalOrder.indexOf(colName));

    // if we already had an object header, keep it; else create one
    const headerObj =
      typeof existing?.header === "object"
        ? existing.header
        : { header: colName };

    return {
      ...existing,
      // Store object-style header for StepList compatibility
      header: headerObj,
      // (Optional) keep a plain string too if other code relies on it
      headerText: colName,
      index,
      type,
    };
  });

  // keep filters as-is; you’re not changing FilterBuilder
  const payload = {
    id: initial?.id || `extractStep_${Date.now()}`,
    type: "gridExtract",
    name: stepName,
    gridSelector,
    rowSelector,
    selectors: { grid: gridSelector, row: rowSelector },
    columnMappings,
    filters: filters || [],
    datasetId: datasetId || undefined,
  };

  if (isPicking) {
    await fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
  }
  onCreate?.(payload);
};

  // --- UI -------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Top info row */}
      <div className="text-sm">
        <div className="px-3 py-2 bg-gray-50 rounded border">
          <span className="text-gray-700">
            <strong>{mode === "edit" ? "Using existing target" : "Target"}</strong>
            {" • "}
            Row: <code>{gridMeta?.rowSelector || "(not set yet)"}</code>
            {" • "}
            Grid: <code>{gridMeta?.gridSelector || "(not set yet)"}</code>
          </span>
          {/* Only show Change target in EDIT mode */}
          {/* {mode === "edit" && (
            <>
              {" • "}
              <button
                type="button"
                className="text-indigo-600 underline"
                onClick={startPick}
              >
                Change target
              </button>
            </>
          )} */}
        </div>
      </div>

      {/* Step name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold mb-2">Select Columns</div>
          <label className="flex items-center gap-2 font-medium mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
              disabled={!columnsForFilters.length}
            />
            Select All
          </label>

          {(columnsForFilters || []).map((c) => (
            <label key={c.header} className="flex items-center gap-2 mb-1 ml-4">
              <input
                type="checkbox"
                checked={selectedColumns.includes(c.header)}
                onChange={() => toggleOne(c.header)}
              />
              {c.header}
            </label>
          ))}
        </div>

        <div>
          <div className="font-semibold mb-2">Step Name</div>
          <input
            className="w-full border px-2 py-1 rounded mb-3"
            placeholder="e.g., Extract PFS Fees"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
          />

          <div className="font-semibold mb-1">Dataset name (optional)</div>
          <input
            className="w-full border px-2 py-1 rounded"
            placeholder="e.g., pfs_fees"
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            If set, rows will be stored under this dataset and can be exported or looped later.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div>
        <div className="font-semibold mb-2">Filters</div>
        <FilterBuilder
          // Provide type info so UI shows (img), date ops, etc.
          columns={columnsForFilters.map(c => ({ header: c.header, type: c.type }))}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Footer */}
      {isPicking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow p-6 w-[min(92vw,26rem)] text-center space-y-3">
            <div className="text-lg font-semibold">Now click on the grid on the page…</div>
            <button
              type="button"
              className="text-sm text-red-600 underline"
              onClick={() => {
                setIsPicking(false);
                fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button type="button" onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-1 rounded"
          onClick={handleSave}
          disabled={!gridMeta?.gridSelector || !selectedColumns.length || !stepName.trim()}
        >
          {mode === "edit" ? "Save Changes" : "Save Step"}
        </button>
      </div>
    </div>
  );
}
