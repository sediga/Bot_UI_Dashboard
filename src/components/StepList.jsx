// StepList.jsx
import { useEffect, useState, useRef } from "react";
import SmartStepWizard from "./SmartStepWizard";
import Modal from "./SmartStepModal";
import config from "../config";
import ParameterMappingModal from "./ParameterMappingModal";
import SecretMapperModal from "./smartsteps/SecretMapperModal";

import ValueWithMapper from "./smartsteps/ValueWithMapper";
import { getLoopColumns } from "./smartsteps/getLoopColumns";
import ColumnContextMenu from "./smartsteps/ColumnContextMenu";

export default function StepList({
  steps,
  setSteps,
  pickedTarget,
  setPickedTarget,
  agentStatus,
  currentLoopId,
  setCurrentLoopId
}) {
  const [expandedSteps, setExpandedSteps] = useState({});
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [finalizedLoops, setFinalizedLoops] = useState(new Set());
  const scrollRef = useRef(null);
  const [showParamModal, setShowParamModal] = useState(false);
  const [pendingStep, setPendingStep] = useState(null);
  const [loopColumns, setLoopColumns] = useState([]);
  // const columns = getLoopColumns(flow, parentLoopStep);

  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCtx, setSecretCtx] = useState(null);
// near other useState calls
const [editingValueStepId, setEditingValueStepId] = useState(null);
 const [columnMenu, setColumnMenu] = useState({
   open: false, x: 0, y: 0, stepId: null, columns: []
 });

// keep an input ref per step so we can insert at caret
const valueInputRefs = useRef({});

// --- parameterize selectors helpers ---------------------------------------
const isTemplate = (v) => typeof v === "string" && /\{\{.+\}\}/.test(v);

// Regex-escape literal for safe replacement
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- selector param policies -------------------------------------------------

// Actions where the *target element* is chosen by data
const SELECTOR_PARAM_ACTIONS = new Set([
  "setcheckbox", "togglecheckbox", "check", "uncheck",
  "setradio", "selectradio",
  "clickbytext", "clickoption", "chooseoption", "selectbytext",
]);

// Actions where data is just injected into a known element (no selector templating)
 const VALUE_ONLY_ACTIONS = new Set([
   "type", "fill", "input", "setvalue", "paste", "clear",
   "upload", "settextarea", "setdate", "settime"
 ]);

const TEXT_INPUT_TYPES = new Set([
  "text","email","tel","search","password","number","date","datetime-local","time","url"
]);

const isCheckboxOrRadio = (step) => {
  const t = step?.signature?.attrs?.type?.toLowerCase?.() || "";
  if (t === "checkbox" || t === "radio") return true;
  const sel = step?.selector || "";
  return /\binput\s*\[\s*type\s*=\s*["']?(checkbox|radio)["']?\s*\]/i.test(sel);
};

// “Does the selector depend on the data?” => only then templatize
const shouldTemplatizeSelector = (step) => {
  if (!step || step.type !== "uiAction") return false;

  // explicit templates on the step mean “yes”
  if (Array.isArray(step.selectorTemplates) && step.selectorTemplates.length) return true;

  const a = (step.action || "").toLowerCase();

  // Checkbox / radio are always label/value-driven
  if (isCheckboxOrRadio(step)) return true;

  // If the action is known to be selector-parametric
  if (SELECTOR_PARAM_ACTIONS.has(a)) return true;

  // If selector clearly uses visible text to pick the node
  if (/:has-text\(|:text\(/i.test(step.selector || "")) return true;

  // If it's a plain text-entry kind of step, never templatize selector
  if (VALUE_ONLY_ACTIONS.has(a)) return false;

  // Text-ish inputs: value-only
  const tag = step?.signature?.tagName?.toLowerCase?.() || "";
  const type = step?.signature?.attrs?.type?.toLowerCase?.() || "";
  if (tag === "input" && (TEXT_INPUT_TYPES.has(type) || type === "")) return false;
  if (tag === "textarea") return false;

  return false;
};


// Conservatively replace the literal inside common selector patterns
const replaceInSelector = (sel, literal, template) => {
  if (!sel || !literal || !template) return sel;
  let s = sel;
  const FROM = escRe(String(literal));

  // since withFilter is a no-op, these are just `template`
  const T_TEXT = withFilter(template, "text");
  const T_CSS  = withFilter(template, "css");

  const rules = [
    // Attribute equalities that carry identifiers/text -> use CSS escaping semantics
    [new RegExp(`(\\[\\s*(?:value|name|placeholder|title)\\s*=\\s*")${FROM}(")`, "gi"), `$1${T_CSS}$2`],
    [new RegExp(`(\\[\\s*for\\s*=\\s*")${FROM}(")`, "gi"), `$1${T_CSS}$2`],
    [new RegExp(`(\\[\\s*id\\s*=\\s*")${FROM}(")`, "gi"), `$1${T_CSS}$2`],
    [new RegExp(`(\\[\\s*data-[^\\]=]+\\s*=\\s*")${FROM}(")`, "gi"), `$1${T_CSS}$2`],

    // :has-text("…") / :text("…") -> use text semantics (fixed: no trailing ) in replacement)
    [new RegExp(`(:has-text\\(\\s*")${FROM}(")`, "gi"), `$1${T_TEXT}$2`],
    [new RegExp(`(:text\\(\\s*")${FROM}(")`, "gi"), `$1${T_TEXT}$2`],

    // role=name regex contexts (keep regex wrapper, swap middle)
    [new RegExp(`(\\[\\s*name\\s*=\\s*"/\\^?)${FROM}((?:\\$)?/i?"\\])`, "gi"), `$1${template}$2`],
    [new RegExp(`(role=\\w+\\[\\s*name\\s*=\\s*"/\\^?)${FROM}((?:\\$)?/i?"\\])`, "gi"), `$1${template}$2`],

    // General quoted fallback (default to text semantics)
    [new RegExp(`(')${FROM}(')`, "g"), `$1${T_TEXT}$2`],
    [new RegExp(`(")${FROM}(")`, "g"), `$1${T_TEXT}$2`],
  ];

  for (const [rx, rep] of rules) s = s.replace(rx, rep);
  return s;
};


const withFilter = (tok, filter) =>
  typeof tok === "string" && tok.includes("{{") && !tok.includes("|")
    ? tok.replace(/}}$/, `|${filter}}}`)
    : tok;

  function instantiateSelectorTemplates(step, valueToken) {
    const out = [];
    const list = Array.isArray(step.selectorTemplates) ? step.selectorTemplates : [];

    for (const tmpl of list) {
      if (!tmpl?.selector) continue;
      // Only support plain {{VALUE}} now
      const sel = tmpl.selector.replaceAll("{{VALUE}}", valueToken);
      out.push({
        selector: sel,
        source: `${tmpl.source || "template"}`,
        param: true,
      });
    }

    // Always keep any existing recorded selector as a tail fallback
    if (typeof step.selector === "string" && step.selector) {
      out.push({ selector: step.selector, source: "recorded", param: false });
    }
    // and any recorded candidates
    if (Array.isArray(step.selectors)) {
      for (const c of step.selectors) {
        if (c?.selector) out.push({ ...c });
      }
    }
    return out;
  }

  const patchSelectorsForParam = (step, oldLiteral, template) => {
    if (!step || !template) return step;

    // Only templatize selectors when the element is chosen by the data
    if (!shouldTemplatizeSelector(step)) {
      return step; // leave selector(s) untouched
    }

  const next = { ...step };
  let changed = false;

  // Preferred: selectorTemplates
  if (Array.isArray(step.selectorTemplates) && step.selectorTemplates.length) {
    next.selectors = instantiateSelectorTemplates(step, template);
    const primary = next.selectors?.[0]?.selector;
    if (primary) {
      next.originalSelector = next.originalSelector || step.selector || primary;
      next.selector = primary;
    }
    changed = true;
  } else {
    // Back-compat: regex/literal patch
    if (typeof step.selector === "string" && step.selector && oldLiteral) {
      const LIT = oldLiteral || step?.value || step?.labelText || "";
      const newSel = replaceInSelector(step.selector, LIT, template);
      if (newSel !== step.selector) {
        next.originalSelector = step.originalSelector || step.selector;
        next.selector = newSel;
        changed = true;
      }
    }
    if (Array.isArray(step.selectors) && step.selectors.length && oldLiteral) {
      const patched = step.selectors.map((c) => {
        const sel = c?.selector || "";
        const LIT = oldLiteral || step?.value || step?.labelText || "";
        const newSel = replaceInSelector(sel, LIT, template);
        if (newSel !== sel) {
          changed = true;
          return {
            ...c,
            originalSelector: c.originalSelector || sel,
            selector: newSel,
            source: `${c.source || "unknown"}:param`,
            param: true,
          };
        }
        return c;
      });
      if (changed) next.selectors = patched;
    }
  }

  if (typeof step.containerSelector === "string" && step.containerSelector) {
    const LIT = oldLiteral || step?.value || step?.labelText || "";
    const cNew = replaceInSelector(step.containerSelector, LIT, template);
    if (cNew !== step.containerSelector) {
      next.containerSelector = cNew;
      changed = true;
    }
  }


  return changed ? next : step;
};


function sanitize(next) {
  // trim outer quotes and whitespace
  if (Array.isArray(next)) {
    return next.map(v => typeof v === "string" ? v.trim() : v);
  } else if (typeof next === "string") {
    next = next.trim();
    if ((next.startsWith('"') && next.endsWith('"')) ||
        (next.startsWith("'") && next.endsWith("'"))) {
      next = next.slice(1, -1);
    }
  }
  return next;
}

const displayValue = (v) => Array.isArray(v) ? v.join(", ") : (v ?? "");

function applyValue(stepId, token) {
  setSteps(prev =>
    prev.map(s => {
      if (s.id !== stepId) return s;

      const el = valueInputRefs.current[stepId];
      const current = s.value || "";
      let next = token;

      // insert at caret when focused, else replace whole value
      if (el && document.activeElement === el) {
        const start = el.selectionStart ?? current.length;
        const end   = el.selectionEnd ?? current.length;
        next = current.slice(0, start) + token + current.slice(end);
      }

      next = sanitize(next);

      // If turning a literal into a {{template}}, also patch selectors
      let patched = s;
      if (isTemplate(next) && current && !isTemplate(current)) {
        patched = patchSelectorsForParam(s, current, next);
      }

      return {
        ...patched,
        value: next,
        dynamicValue: next,
        label: `${(s.action || "Action").replace(/^./, c => c.toUpperCase())}: ${next}`,
      };
    })
  );
}

 const guessSecretName = (s) => {
    const a = s?.attributes || {};
    const pick =
      s?.label ||
      a.placeholder ||
      a.name ||
      a.id ||
      s?.innerText ||
      s?.elementText ||
      "secret";
    return String(pick)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "secret";
  };  
  
const updateStep = (id, patch) =>
  setSteps(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));

  useEffect(() => {
    const initialExpanded = {};
    steps.forEach((step, index) => {
      if (["dataLoop", "counterloop", "loop"].includes(step.type)) {
        initialExpanded[step.id] = true;
      }
    });
    setExpandedSteps(initialExpanded);
  }, [steps]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps]);

  const toggleExpand = (id) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const deleteStep = (stepId) => {
    const updated = steps.filter((s) => s.id !== stepId && s.parentId !== stepId);
    setSteps(updated);
  };

  const deleteSubStep = (step) => {
    const parentId = step.parentId;
    const siblings = steps.filter((s) => s.parentId === parentId && s.id !== step.id);
    const parentIsFinalized = finalizedLoops.has(parentId);

    if (siblings.length === 0 && parentIsFinalized) {
      const confirmDelete = window.confirm(
        "This is the last step in the loop and the loop is finalized. Delete the entire loop?"
      );
      if (!confirmDelete) return;

      const updated = steps.filter((s) => s.id !== step.id && s.id !== parentId);
      setSteps(updated);
    } else {
      const updated = steps.filter((s) => s.id !== step.id);
      setSteps(updated);
    }
  };

  const handleSmartStepCreated = async (step) => {
    setSteps((prev) => [...prev, step]);
    setPickedTarget(null);
    setShowSmartWizard(false);

    if (["loop", "dataLoop", "counterloop"].includes(step.type)) {
      await startLoopRecording(step);
    }
  };

  const handleCancelWizard = () => {
    setPickedTarget(null);
    setShowSmartWizard(false);
    fetch(`${config.agentServerUrl}/api/target-pick-done`, {
      method: "POST",
    }).catch((err) => console.error("Failed to notify agent on cancel:", err));
  };

  const extractSteps = steps.filter((step) => ["gridExtract","importData"].includes(step.type));
  const canAddSmartStep =
    agentStatus === "recording" && !showSmartWizard && currentLoopId === null;

  const startLoopRecording = async (step) => {
    try {
      // await fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ loopName: step.name }),
      // });
      setCurrentLoopId(step.id);
    } catch (err) {
      console.error("Failed to start loop recording", err);
    }
  };

  const stopLoopRecording = async () => {
    const hasSteps = steps.some((s) => s.parentId === currentLoopId);

    if (!hasSteps) {
      const confirmDelete = window.confirm(
        "This loop has no recorded steps. It will be deleted. Proceed?"
      );
      if (!confirmDelete) return;

      const updatedSteps = steps.filter(
        (s) => s.id !== currentLoopId && s.parentId !== currentLoopId
      );
      setSteps(updatedSteps);
    } else {
      setFinalizedLoops((prev) => new Set(prev).add(currentLoopId));
    }

    try {
      await fetch(`${config.agentServerUrl}/api/end-loop-recording`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to end loop recording", err);
    }

    setCurrentLoopId(null);
  };

  const renderStep = (step, level = 0) => {
    const indent = `ml-${level * 4}`;
    const hasChildren = steps.some((s) => s.parentId === step.id);
    const isRecording = currentLoopId === step.id;
    const isFinalized = finalizedLoops.has(step.id);
 const parentLoop = steps.find(s => s.id === step.parentId && s.type === "dataLoop");
const columnsForThisStep = (() => {
  if (!parentLoop) return [];
  // resolve source step id (string or {stepId})
  const sourceId = typeof parentLoop.source === "string"
    ? parentLoop.source
    : (parentLoop.source?.stepId || parentLoop.source);
  const src = steps.find(s => s.id === sourceId);
  if (!src) return [];
  if (src.type === "gridExtract") {
    return (src.columnMappings || [])
      .map(c => c?.header?.header)
      .filter(Boolean);
  }
  if (src.type === "importData") {
    return (src.columns || [])
      .map(c => (typeof c === "string" ? c : c?.name))
      .filter(Boolean);
  }
  return [];
})(); 
    return (
      <li
        key={step.id}
        className={`p-3 rounded shadow flex justify-between items-start ${indent} ${
          step.validationStatus === "failed"
            ? "bg-yellow-50 border-l-4 border-yellow-400"
            : "bg-slate-100"
        }`}
      >
        <div className="flex-1 pr-2 space-y-1">
          {step.type === "navigate" && (
            <div>
              <span className="font-medium text-indigo-600">Navigate:</span>{" "}
              <span className="text-gray-700">{step.url}</span>
            </div>
          )}

          {step.type === "uiAction" && (
            <div>
              <div>
                <span className="font-medium text-purple-600">{step.action}</span>{" "}
                →{" "}
                <span className="text-slate-700">
                  {step.label || (
                    <span className="text-gray-400 italic">No label</span>
                  )}
                </span>
                {step.value && (
                  editingValueStepId === step.id ? (
                    <div className="mt-2 space-y-2">
                       {/* Text box shows current mapping/value */}
                      <input
                        ref={el => { valueInputRefs.current[step.id] = el; }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={step.value || ""}
                        onChange={(e) => {
                          const v = sanitize(e.target.value);
                          updateStep(step.id, {
                            value: v,
                            dynamicValue: v,
                            label: `${(step.action || "Action").replace(/^./, c => c.toUpperCase())}: ${v}`
                          });
                        }}
                        placeholder='e.g. {{row.Column}} or {{secret:agent/key}}'
                      />
                
                       <div className="flex items-center gap-3">
                         {/* Map (column) – opens context menu */}
                         <button
                           className={`text-xs underline ${columnsForThisStep.length ? "text-blue-600" : "text-gray-400 cursor-not-allowed"}`}
                           disabled={!columnsForThisStep.length}
                           onClick={(e) => {
                             e.stopPropagation();
                             setColumnMenu({
                               open: true,
                               x: e.clientX,
                               y: e.clientY,
                               stepId: step.id,
                               columns: columnsForThisStep,
                             });
                           }}
                           title={columnsForThisStep.length ? "Map from loop column" : "No columns (not inside a data loop)"}
                         >
                           Map Column
                         </button>
                
                         <span className="text-gray-300">|</span>
                
                         {/* Map Secret – unchanged */}
                         <button
                           className="text-xs text-green-700 underline"
                           onClick={(e) => {
                             e.stopPropagation();
                             setSecretCtx({
                               eventId: step.eventId || step.id,
                               stepId: step.id,
                               suggestedName: guessSecretName(step),
                             });
                             setShowSecretModal(true);
                           }}
                         >
                           Map Secret
                        </button>

                        <button
                          className="text-xs text-gray-600 underline"
                          onClick={() => setEditingValueStepId(null)}
                        >
                          Done
                        </button>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Tip: <code>{'{{row.Column}}'}</code> for loop data, <code className="ml-1">{'{{secret:agent/key}}'}</code> for secrets.
                      </div>
                    </div>
                  ) : (
                    // collapsed view — click to edit just this step
                    <button
                      className="text-green-700 ml-1 underline decoration-dotted hover:text-green-800"
                      title="Edit or map this value"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingValueStepId(step.id);
                      }}
                    >
                      ={` "${displayValue(step.value)}"`}
                    </button>
                  )
                )}                {step.validationStatus === "failed" && (
                  <div className="inline-flex items-center ml-2 text-yellow-600 group relative">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 fill-yellow-500"
                      viewBox="0 0 24 24"
                    >
                      <path d="M1 21h22L12 2 1 21zm13-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {step.validationReason || "This action may fail during replay"}
                    </div>
                  </div>
                )}
              </div>
          {step.isDynamic && (
            <div className="relative group inline-block ml-2">
              <button
                className="text-blue-600 underline text-xs"
                onClick={() => {
                  const gridStep = steps.find(
                    (s) => s.type === "gridExtract" && s.parentId === step.Id
                  );
                  const columns = gridStep?.columnMappings?.map((col) => col.header?.header) || [];
                  setLoopColumns(columns);
                  setPendingStep(step);
                  setShowParamModal(true);
                }}
              >
                Map
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Edit dynamic input value
              </div>
            </div>
          )}
            </div>
          )}

          {(step.type === "loop" ||
            step.type === "counterloop" ||
            step.type === "dataLoop") && (
            <div className="flex items-start space-x-2">
              <button
                onClick={() => toggleExpand(step.id)}
                className="text-xs text-blue-600 mt-1"
              >
                {expandedSteps[step.id] ? "[−]" : "[+]"}
              </button>
              <div className="flex-1 bg-green-50">
                <div className="font-semibold text-green-700">
                  {step.name || `Loop (${step.source || step.id})`}
                </div>

                {isRecording && (
                  <div className="text-xs text-green-700 font-medium">
                    🎤 Recording steps inside this loop…
                  </div>
                )}
                {isFinalized && !isRecording && (
                  <div className="text-xs text-gray-500 font-medium">
                    ✅ Finalized – recording disabled
                  </div>
                )}

                {expandedSteps[step.id] &&
                  steps
                    .filter((s) => s.parentId === step.id)
                    .map((child) => renderStep(child, level + 1))}
              </div>
            </div>
          )}


          {step.type === "gridExtract" && (
            <div className="p-2 rounded border bg-green-50">
              <div className="font-semibold text-green-700">
                {step.name || `Grid Extract (${step.id})`}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>ID:</strong> <code>{step.id}</code>
              </div>
              <ul className="text-sm list-disc pl-4 mb-2">
                {step.columnMappings?.map((col) => (
                  <li key={col.header?.header}>
                    {col.header?.header} (Index: {col.columnIndex})
                  </li>
                ))}
              </ul>
              {step.filters?.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Filters:</p>
                  <ul className="list-disc pl-4">
                    {step.filters.map((f, idx) => (
                      <li key={idx}>
                        {typeof f.column === "object"
                          ? f.column.header || JSON.stringify(f.column)
                          : f.column}{" "}
                        {f.operator} "{f.value}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step.type === "importData" && (
            <div className="p-2 rounded border bg-green-50">
              <div className="font-semibold text-green-700">
                {step.name || `Grid Extract (${step.id})`}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>ID:</strong> <code>{step.id}</code>
              </div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>Path:</strong> <code>{step.file?.path}</code>
              </div>
              <ul className="text-sm list-disc pl-4 mb-2">
                {step.columns?.map((col, index) => (
                  <li key={index}>
                    {col}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.type === "exportData" && (
            <div className="p-2 rounded border bg-green-50">
              <div className="font-semibold text-green-700">
                {step.name || `Export Data (${step.id})`}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                <strong>ID:</strong> <code>{step.id}</code>
              </div>
              <ul className="text-sm list-disc pl-4 mb-2">
                <li><strong>Source Step:</strong> {step.source}</li>
                <li><strong>Format:</strong> {step.format}</li>
                <li><strong>Filename:</strong> {step.filename}</li>
                <li><strong>Append Timestamp:</strong> {step.appendTimestamp ? "Yes" : "No"}</li>
                <li><strong>Overwrite if Exists:</strong> {step.overwrite ? "Yes" : "No"}</li>
              </ul>
              {step.columns?.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium mb-1">Columns to Export:</p>
                  <ul className="list-disc pl-4">
                    {step.columns.map((col, idx) => (
                      <li key={idx}>{col}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-1 text-xs ml-2">
          <button
            onClick={() =>
              step.parentId ? deleteSubStep(step) : deleteStep(step.id)
            }
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="col-span-1 bg-white p-4 rounded shadow flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Steps</h2>
        <ul className="space-y-2 text-sm">
          {steps
            .filter((step) => step.parentId === undefined || step.parentId === null)
            .map((step) => renderStep(step))}
        </ul>

        {currentLoopId !== null && (
          <div className="flex justify-between items-center mt-4 text-sm bg-green-50 border border-green-300 p-2 rounded">
            <span className="text-green-800">
              Recording inside loop:{" "}
              <strong>
                {steps.find((s) => s.id === currentLoopId)?.name || currentLoopId}
              </strong>
            </span>
            <button onClick={stopLoopRecording} className="text-red-600 underline">
              Finish Loop Recording
            </button>
          </div>
        )}

        <div ref={scrollRef} className="mt-6 border-t pt-4">
          <h3 className="text-md font-semibold mb-2">Insert Smart Step</h3>
          <button
            onClick={() => setShowSmartWizard(true)}
            className={`px-3 py-1 rounded text-white ${
              canAddSmartStep ? "bg-blue-600" : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!canAddSmartStep}
          >
            Add Smart Step
          </button>
          {!canAddSmartStep && (
            <p className="text-xs text-gray-500 mt-1">
              Enable recording mode to insert new Smart Step.
            </p>
          )}
        </div>

        {showSmartWizard && (
          <Modal onClose={handleCancelWizard}>
            <SmartStepWizard
              pickedTarget={pickedTarget}
              onSmartStepCreated={handleSmartStepCreated}
              onCancel={handleCancelWizard}
              onClose={handleCancelWizard}
              availableExtractSteps={extractSteps}
            />
          </Modal>
        )}

        {showParamModal && (
          <ParameterMappingModal
            show={showParamModal}
            onClose={() => {
              setShowParamModal(false);
              setPendingStep(null);
            }}
            onSave={(newValue) => {
              setSteps(prev =>
                prev.map(s => {
                  if (s.id !== pendingStep.id) return s;

                  let updated = {
                    ...s,
                    value: newValue,
                    dynamicValue: newValue,
                    label: `${s.action.charAt(0).toUpperCase() + s.action.slice(1)}: ${newValue}`
                  };

                  // If switching literal -> template, parameterize selectors
                  if (isTemplate(newValue) && s.value && !isTemplate(s.value)) {
                    updated = patchSelectorsForParam(updated, s.value, newValue);
                  }

                  return updated;
                })
              );

              setShowParamModal(false);
              setPendingStep(null);
            }}
            columns={loopColumns}
            defaultValue={pendingStep?.value || ""}
          />
        )}

        {showSecretModal && secretCtx && (
          <SecretMapperModal
            open={showSecretModal}
            eventId={secretCtx.eventId}
            suggestedName={secretCtx.suggestedName}
            onClose={() => {
              setShowSecretModal(false);
              setSecretCtx(null);
            }}
            onMapped={(scope, name) => {
              applyValue(secretCtx.stepId, `{{secret:${scope}/${name}}}`, { mode: "replace" });
              setShowSecretModal(false);
              setSecretCtx(null);
            }}          />
        )}      
        <ColumnContextMenu
          open={columnMenu.open}
          x={columnMenu.x}
          y={columnMenu.y}
          columns={columnMenu.columns}
          onSelect={(col) => {
            const token = `{{row.${col}}}`;
            // replace/insert value for this step (your helper)
            applyValue(columnMenu.stepId, token);
            setColumnMenu(cm => ({ ...cm, open: false }));
          }}
          onClose={() => setColumnMenu(cm => ({ ...cm, open: false }))}
        />
        </div>
    </section>
  );
}
