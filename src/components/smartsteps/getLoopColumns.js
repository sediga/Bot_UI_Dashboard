// helpers/getLoopColumns.js
export function getLoopColumns(flow, loopStep) {
  if (!loopStep || loopStep.type !== "dataLoop") return [];

  const src = loopStep.source || {};
  const byId = (id) => (flow?.steps || []).find((s) => s.id === id);

  if (src.kind === "extractStep" || src.kind === "gridExtract") {
    const extract = byId(src.stepId);
    // columns may be array of strings OR objects {name: "..."}
    const cols = extract?.columns || [];
    return cols.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
  }

  if (["importStep","importData","import"].includes(src.kind)) {
    const imp = byId(src.stepId);
    const baseCols = (imp?.columns || [])
      .map((c) => (typeof c === "string" ? c : c?.name))
      .filter(Boolean);
    const derived = (imp?.derivedFields || [])
      .map((r) => (typeof r?.name === "string" ? r.name.trim() : ""))
      .filter(Boolean);
    return Array.from(new Set([...baseCols, ...derived]));
  }

  return [];
}
