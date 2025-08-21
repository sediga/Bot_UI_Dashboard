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
    const cols = imp?.columns || [];
    return cols.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
  }

  return [];
}
