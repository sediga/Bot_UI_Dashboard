// StepList.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import SmartStepWizard from "./SmartStepWizard";
import Modal from "./SmartStepModal";
import config from "../config";
import ParameterMappingModal from "./ParameterMappingModal";
import SecretMapperModal from "./smartsteps/SecretMapperModal";

import ValueWithMapper from "./smartsteps/ValueWithMapper";
import { getLoopColumns } from "./smartsteps/getLoopColumns";
import ColumnContextMenu from "./smartsteps/ColumnContextMenu";
import StepEditorModal from "./StepEditorModal";
import SmartStepEditModal from "./smartsteps/SmartStepEditModal";

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
  const [editingStepId, setEditingStepId] = useState(null);

  // const columns = getLoopColumns(flow, parentLoopStep);

  const [showSecretModal, setShowSecretModal] = useState(false);
  const [secretCtx, setSecretCtx] = useState(null);
  // near other useState calls
  const [editingValueStepId, setEditingValueStepId] = useState(null);
  const [columnMenu, setColumnMenu] = useState({
    open: false, x: 0, y: 0, stepId: null, columns: []
  });
  // --- generic container model (any container can nest any container) ---
  const CONTAINER_TYPES = new Set(["loop", "dataLoop", "counterloop", "navigate"]);
  const isContainer = (s) => !!s && CONTAINER_TYPES.has(s.type);

  const [containerStack, setContainerStack] = useState([]); // stack of step ids
  const handleCloseEditor = useCallback(() => setEditingStepId(null), []);
  const handleSaveEditor = useCallback((patched) => {
    setSteps(prev =>
      prev.map(s =>
        s.id === editingStepId ? { ...s, ...patched, id: s.id, parentId: s.parentId } : s
      )
    );
    setEditingStepId(null);
  }, [editingStepId, setSteps]);

  // derive current container from stack; fall back to prop for back-compat
  const currentContainerId = containerStack.length
    ? containerStack[containerStack.length - 1]
    : (currentLoopId ?? null);

  const pushContainer = (id) => {
    setContainerStack(prev => (prev.includes(id) ? prev : [...prev, id]));
    if (setCurrentLoopId) setCurrentLoopId(id);
  };

  const popContainer = () => {
    setContainerStack((prev) => {
      const next = prev.slice(0, -1);
      if (setCurrentLoopId) setCurrentLoopId(next.length ? next[next.length - 1] : null);
      return next;
    });
  };

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

  // --- Continue Recording helpers ---------------------------------------------
  const [resuming, setResuming] = useState(false);

  const authHeader = () => {
    // Pull from your existing storage key
    const tok = localStorage.getItem("botflows_token") || "";
    return tok.startsWith("Bearer ") ? tok : tok ? `Bearer ${tok}` : "";
  };

  // --- filter display helpers (place near other helpers) ---
  const getHeaderText = (col) =>
    typeof col === "string" ? col : (col?.header || col?.name || col?.key || "");

  const fmtVal = (v) => Array.isArray(v) ? v.join(", ") : (v ?? "");

  // Flatten in display order, preserving parent→children order
  function flattenSteps(all) {
    const byParent = new Map();
    all.forEach(s => {
      const pid = s.parentId ?? "__ROOT__";
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(s);
    });

    const out = [];
    function walk(pid, level = 0) {
      const kids = byParent.get(pid) || [];
      for (const k of kids) {
        out.push(k);
        // containers recurse
        if (isContainer(k)) walk(k.id, level + 1);
      }
    }
    walk("__ROOT__");
    return out;
  }

  // --- Finish Recording enablement (UI-only) -----------------------------------
  const [finishEnabledIds, setFinishEnabledIds] = useState(new Set());

  const topNavigateId = (allSteps) => {
    const top = allSteps.filter(s => s.parentId == null);
    const nav = top.find(s => String(s.type || "").toLowerCase() === "navigate");
    return nav?.id || null;
  };

  const lastContainerIfTopLastIsContainer = (allSteps) => {
    const top = allSteps.filter(s => s.parentId == null);
    const last = top[top.length - 1];
    return last && isContainer(last) ? last.id : null;
  };

  // Pick the *deepest last* actionable step as default stop target
  function pickStopTarget(all) {
    const flat = flattenSteps(all);
    if (flat.length === 0) return { id: null, index: null };

    // Prefer the last UI/action-ish step; otherwise the last step
    const ACTION_TYPES = new Set([
      "uiAction","navigate","dataLoop","counterloop","loop",
      "gridExtract","importData","apiExtract","exportData", "keyValueExtract", "keyValueCollect"
    ]);

    for (let i = flat.length - 1; i >= 0; i--) {
      const t = (flat[i].type || "").toLowerCase();
      if (ACTION_TYPES.has(t)) return { id: flat[i].id, index: i };
    }
    return { id: flat[flat.length - 1].id, index: flat.length - 1 };
  }

  // Minimal flow payload similar to what you send to /api/replay today
  function buildFlowForAgent() {
    // If you already maintain a richer flow object elsewhere, swap this in.
    return { steps: [...steps] };
  }
  const resetContainerStack = () => setContainerStack([]);

  async function handleContinueRecordingClick() {
    if (resuming) return;
    setResuming(true);
    try {
      const res = await fetch(`${config.agentServerUrl}/api/continue-recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader() },
        body: JSON.stringify(steps),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error?.message || `HTTP ${res.status}`);

      const navId = topNavigateId(steps);
      const lastContId = lastContainerIfTopLastIsContainer(steps);

      // containers we want to re-open
      const orderedRaw = [navId, lastContId].filter(Boolean);
      // IMPORTANT: un-finalize any we’re reopening
      setFinalizedLoops(prev => {
        const next = new Set(prev);
        orderedRaw.forEach(id => next.delete(id));
        return next;
      });

      // seed finish-enabled ids (now not filtered by finalized)
      const ordered = Array.from(new Set(orderedRaw));
      setFinishEnabledIds(new Set(ordered));

      // rebuild the stack to match the reopening order
      resetContainerStack();
      ordered.forEach(pushContainer);
    } catch (err) {
      alert(`Resume failed: ${err.message || err}`);
    } finally {
      setResuming(false);
    }
  }

async function stopAgentNow() {
  try {
    await fetch(`${config.agentServerUrl}/api/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "no-active-containers" })
    });
  } catch {}
}

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
      if (isContainer(step)) {
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

  // If parent tells us the current container (e.g., top-level Navigate just created),
  // ensure it's on our internal stack so the UI behaves like a container.
  useEffect(() => {
    if (!currentLoopId) return;
    if (containerStack.includes(currentLoopId)) return;
    const s = steps.find(st => st.id === currentLoopId);
    if (s && isContainer(s)) {
      pushContainer(currentLoopId);
    }
  }, [currentLoopId, steps]); 

  const toggleExpand = (id) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const deleteStep = (stepId) => {
    const updated = steps.filter((s) => s.id !== stepId && s.parentId !== stepId);
    setSteps(updated);
    pruneStackAgainst(updated);
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
      pruneStackAgainst(updated);
    } else {
      const updated = steps.filter((s) => s.id !== step.id);
      setSteps(updated);
      pruneStackAgainst(updated);
    }
  };

  const handleSmartStepCreated = async (step) => {
    // parent to whichever container is active
    if (currentContainerId) {
      step.parentId = currentContainerId;
    }

    setSteps(prev => [...prev, step]);
    setPickedTarget(null);
    setShowSmartWizard(false);

    // START ANY CONTAINER (loop / dataLoop / counterloop / navigate)
    await startContainerRecording(step);
  };

  const handleCancelWizard = () => {
    setPickedTarget(null);
    setShowSmartWizard(false);
    fetch(`${config.agentServerUrl}/api/target-pick-done`, {
      method: "POST",
    }).catch((err) => console.error("Failed to notify agent on cancel:", err));
  };

  const extractSteps = steps.filter((step) => ["gridExtract","importData","apiExtract", "keyValueExtract", "keyValueCollect"].includes(step.type));
  const canAddSmartStep =
    agentStatus === "recording" && !showSmartWizard;

  const startLoopRecording = async (step) => {
    try {
      pushContainer(step.id);
    } catch (err) {
      console.error("Failed to start loop recording", err);
    }
  };


  // Finish recording for a particular container id,
  // ending any nested containers above it first (inner → outer).
  const finishRecordingTo = async (targetId) => {
    if (!containerStack.length) return;

    // Pop until target is on top; break if user cancels any step
    while (containerStack.length && containerStack[containerStack.length - 1] !== targetId) {
      const ok = await stopContainerRecording();
      if (!ok) return; // user canceled – stop the chain
    }

    // Now end the target itself (if still present)
    if (containerStack.length && containerStack[containerStack.length - 1] === targetId) {
      await stopContainerRecording();
    }
    setFinishEnabledIds(prev => {
      if (!prev.size) return prev;
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });

  };

  const stopLoopRecording = async () => {
    const loopId = currentContainerId;
    const hasSteps = steps.some((s) => s.parentId === loopId);

    if (!hasSteps) {
      const confirmDelete = window.confirm(
        "This loop has no recorded steps. It will be deleted. Proceed?"
      );
      if (!confirmDelete) return;

      const updatedSteps = steps.filter((s) => s.id !== loopId && s.parentId !== loopId);
      setSteps(updatedSteps);
      pruneStackAgainst(updatedSteps);
    } else {
      setFinalizedLoops((prev) => {
        const next = new Set(prev);
        next.add(loopId);
        return next;
      });
    }

    try {
      await fetch(`${config.agentServerUrl}/api/end-loop-recording`, { method: "POST" });
    } catch (err) {
      console.error("Failed to end loop recording", err);
    }

    popContainer();
  };

  // --- start any container (loop, dataLoop, counterloop, navigate) ---
  const startContainerRecording = async (step) => {
    if (!isContainer(step)) return;

    if (step.type === "navigate") {
      // Optimistic push so the Navigate is the *active* (innermost) container immediately
      pushContainer(step.id);

      // Try the two agent calls, but DO NOT roll back the stack on failure.
      // UI must remain consistent: Navigate is the active container now.
      try {
        await fetch(`${config.agentServerUrl}/api/overlay/show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Recording in a new tab. This tab is paused." }),
        }).catch(() => {}); // non-fatal
      } catch (_) { /* swallow */ }

      try {
        await fetch(`${config.agentServerUrl}/api/start-navigate-recording`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId: step.id,
            previewUrl: step.url || "about:blank",
            target: step.target || "newTab",
            waitUntil: step.waitUntil || "domcontentloaded",
            timeoutMs: step.timeoutMs || 15000,
            ephemeral: true,
          }),
        }).catch(() => {}); // non-fatal
      } catch (_) { /* swallow */ }

      return; // keep Navigate on stack regardless of API success
    }

    // loop-like containers: just push (optionally notify agent here)
    pushContainer(step.id);
    // optionally: await fetch(`${config.agentServerUrl}/api/start-loop-recording`, { ... })
  };


  // --- stop current container (delete-if-empty or finalize), any type ---
  // returns true if stopped, false if user canceled
  // Pass the container id you want to close; defaults to top-of-stack
  const stopContainerRecording = async (targetId) => {
    // Snapshot to avoid reading stale state after async updates
    const stack = [...containerStack];
    const id = targetId ?? stack[stack.length - 1];
    if (!id) return false;

    // Helper: end a container on the agent (navigate vs loop)
    const endOnAgent = async (step) => {
      const isNav = step?.type === "navigate";
      try {
        if (isNav) {
          await fetch(`${config.agentServerUrl}/api/end-navigate-recording`, { method: "POST" });
          try { await fetch(`${config.agentServerUrl}/api/overlay/hide`, { method: "POST" }); } catch {}
        } else {
          await fetch(`${config.agentServerUrl}/api/end-loop-recording`, { method: "POST" }).catch(() => {});
        }
      } catch (e) {
        console.error("Failed to end container recording", e);
      }
    };

    // If the requested id is not on the stack, just clean flags and bail
    if (!stack.includes(id)) {
      setFinishEnabledIds(prev => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return false;
    }

    // Unwind inner containers until the target is on top
    while (stack.length && stack[stack.length - 1] !== id) {
      const innerId = stack.pop();
      const inner = steps.find(s => s.id === innerId);
      await endOnAgent(inner); // finalize inner recording on agent
      // Reflect the pop in UI state
      popContainer(); // your existing helper that pops top from state
    }

    // Now the target is on top
    const container = steps.find(s => s.id === id);

    // If somehow missing (deleted elsewhere), clear flags/stack and stop agent if needed
    if (!container) {
      setFinishEnabledIds(prev => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const willBeEmpty = stack.length <= 1;
      popContainer(); // pop the (now-stale) top
      if (willBeEmpty) await stopAgentNow();
      return true;
    }

    const isNav = container.type === "navigate";
    const hasChildren = steps.some(s => s.parentId === container.id);

    // No children → delete the empty container
    if (!hasChildren) {
      const ok = window.confirm(
        `This ${isNav ? "navigate" : "loop"} has no recorded steps. It will be deleted. Proceed?`
      );
      if (!ok) return false;

      // Remove container and any stale children just in case
      const updated = steps.filter(s => s.id !== container.id && s.parentId !== container.id);
      setSteps(updated);

      await endOnAgent(container);

      // Clear any finish-enable flags
      setFinishEnabledIds(prev => {
        if (!prev.size) return prev;
        const next = new Set(prev);
        next.delete(container.id);
        return next;
      });

      // Pop the target and maybe stop agent if this was the last one
      // after await endOnAgent(container)
      const willBeEmpty = stack.length <= 1;
      popContainer();
      try {
        if (willBeEmpty) await stopAgentNow();
      } finally {
        // belt & suspenders: if agent is still “recording” per your UI state,
        // clear any stray finish flags so links don’t linger after stop.
        if (willBeEmpty) {
          setFinishEnabledIds(prev => {
            if (!prev.size) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }

      return true;
    }

    // Has children → finalize but keep it in the step list
    setFinalizedLoops(prev => {
      const next = new Set(prev);
      next.add(container.id);
      return next;
    });

    await endOnAgent(container);

    // Clear finish-enable flag now that it's finalized
    setFinishEnabledIds(prev => {
      if (!prev.size) return prev;
      const next = new Set(prev);
      next.delete(container.id);
      return next;
    });

    // Pop the target we just finalized and stop agent if no containers remain
    const willBeEmpty = stack.length <= 1;
    popContainer();
    if (willBeEmpty) await stopAgentNow();
    return true;
  };
    
  const pruneStackAgainst = (updatedSteps) => {
    const ids = new Set(updatedSteps.map(s => s.id));
    setContainerStack(prev => prev.filter(id => ids.has(id)));
    setFinishEnabledIds(prev => {
      if (!prev.size) return prev;
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next;
    });
    if (setCurrentLoopId) {
      const top = ids.has(currentContainerId) ? currentContainerId : null;
      setCurrentLoopId(top);
    }
  };

  // --- container badges --------------------------------------------------------
  const badgeText = (t) =>
    t === "navigate"     ? "Navigate" :
    t === "dataLoop"     ? "Data Loop" :
    t === "counterloop"  ? "Counter Loop" :
    t === "loop"         ? "Loop" :
    "Container";

  const badgeClass = (t) => {
    const base = "inline-flex items-center rounded px-2 py-[2px] text-[10px] font-semibold";
    // subtle color coding per type
    if (t === "navigate")    return `${base} bg-indigo-100 text-indigo-700`;
    if (t === "dataLoop")    return `${base} bg-emerald-100 text-emerald-700`;
    if (t === "counterloop") return `${base} bg-amber-100 text-amber-700`;
    if (t === "loop")        return `${base} bg-sky-100 text-sky-700`;
    return `${base} bg-slate-100 text-slate-700`;
  };

  const renderStep = (step, level = 0) => {
    const indent = `ml-${level * 4}`;
    const hasChildren = steps.some((s) => s.parentId === step.id);
    const isRecording = currentContainerId === step.id;
    const isFinalized = finalizedLoops.has(step.id);

    const finishLabel = step.type === "navigate" ? "Finish Recording" : "Finish Loop Recording";
    // find the nearest dataLoop ancestor (works through navigate, loop, etc.)
    const dataLoopAncestor = findAncestor(
      steps,
      step.parentId,
      (n) => n.type === "dataLoop"
    );
    
    const showFinishForThis = agentStatus === "recording" &&
      !finalizedLoops.has(step.id) &&
      (currentContainerId === step.id || finishEnabledIds.has(step.id));

    const columnsForThisStep = (() => {
      if (!dataLoopAncestor) return [];

      // resolve source step id (string or {stepId})
      const sourceId = typeof dataLoopAncestor.source === "string"
        ? dataLoopAncestor.source
        : (dataLoopAncestor.source?.stepId || dataLoopAncestor.source);

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
      // NEW: support API Extract as a data source for dataLoop
      if (src.type === "apiExtract") {
        return (src.columnMappings || [])
          .map(c =>
            typeof c?.header === "string"
              ? c.header
              : (c?.header?.header || c?.header?.name || c?.header?.key || "")
          )
          .filter(Boolean);
      }

      return [];
    })();

    // Walk up parents to find the first node that matches `predicate`.
    // Guards against accidental cycles and absurd depth.
    function findAncestor(steps, startId, predicate, maxHops = 20) {
      const byId = new Map(steps.map(s => [s.id, s]));
      const seen = new Set();
      let hops = 0;
      let id = startId;

      while (id != null && hops < maxHops) {
        if (seen.has(id)) break; // cycle guard
        seen.add(id);

        const node = byId.get(id);
        if (!node) break;

        if (predicate(node)) return node;

        id = node.parentId;
        hops += 1;
      }
      return null;
    }

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
                )}                
                {step.validationStatus === "failed" && (
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
                    (s) => s.type === "gridExtract" && s.parentId === step.id
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

          {isContainer(step) && (
            <div className="flex items-start space-x-2">
              <button
                onClick={() => toggleExpand(step.id)}
                className="text-xs text-blue-600 mt-1"
              >
                {expandedSteps[step.id] ? "[−]" : "[+]"}
              </button>
              <div className="flex-1 bg-green-50">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-purple-600">{badgeText(step.type)}</span>

                  <span className="font-semibold text-green-700">
                    {step.type === "navigate"
                      ? (() => {
                          const title = step.name || "Navigate";
                          const url = step.url ? ` — ${step.url}` : "";
                          return `${url}`;
                        })()
                      : (step.name || `Loop (${step.source || step.id})`)}
                  </span>
                </div>

                {/* If this is the active (innermost) container */}
                {(isRecording || showFinishForThis) && (
                  <div className="text-xs text-green-700 font-medium">
                    🎤 Recording steps inside this {step.type === "navigate" ? "navigate" : "loop"}…
                    <button
                      onClick={() => stopContainerRecording(step.id)}
                      className="ml-2 text-red-600 underline"
                      title={step.type === "navigate" ? "Finish Recording" : "Finish Loop Recording"}
                    >
                      {step.type === "navigate" ? "Finish Recording" : "Finish Loop Recording"}
                    </button>
                  </div>
                )}
                
                <ul className="space-y-2 text-sm">

                 {expandedSteps[step.id] &&
                  steps
                    .filter((s) => s.parentId === step.id)
                    .map((child) => renderStep(child, level + 1))}
                </ul>
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

          {step.type === "keyValueExtract" && (
            <div>
              <span className="font-medium text-sky-700">Key–value extract</span>{" "}
              →{" "}
              <span className="text-slate-700">
                {step.label || "Key–value fields"}
              </span>

              {Array.isArray(step.config?.pairs) && step.config.pairs.length > 0 && (
                <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                  {step.config.pairs.map((p, idx) => (
                    <div key={idx}>
                      {p.label || p.key || `Field ${idx + 1}`}{" "}
                      <code>{p.valueSelector || "(value selector)"}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step.type === "keyValueCollect" && (
            <div>
              <span className="font-medium text-sky-700">Key–value collect</span>{" "}
              →{" "}
              <span className="text-slate-700">
                {step.name || "Collected key–value items"}
              </span>

              {/* Show field definitions */}
              {Array.isArray(step.fields) && step.fields.length > 0 && (
                <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                  {step.fields.map((f, idx) => (
                    <div key={idx}>
                      {f.label || f.key || `Field ${idx + 1}`}{" "}
                      <code>{f.valueSelector || "(value selector)"}</code>
                    </div>
                  ))}
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

          {step.type === "apiExtract" && (
            <div className="
                rounded-2xl border border-gray-200 bg-white shadow-sm
                p-4 md:p-5 text-sm
              ">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium
                                border-blue-200 text-blue-700 bg-blue-50">
                  API Extract
                </span>
                {step.name && (
                  <span className="text-gray-500 text-xs">( {step.name} )</span>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500 text-xs">Method</div>
                  <div className="font-medium">{step.request?.method || "GET"}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-gray-500 text-xs">URL</div>
                  <div className="font-medium font-mono break-all">
                    {step.request?.url}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Items Path</div>
                  <div className="font-mono">{step.resultPath || "$.data"}</div>
                </div>
                {step.pagination?.mode && step.pagination.mode !== "none" && (
                  <div>
                    <div className="text-gray-500 text-xs">Pagination</div>
                    <div className="font-mono">
                      {step.pagination.mode === "page"
                        ? `page=${step.pagination.param || "page"}, limit=${step.pagination.limitParam || "limit"}`
                        : `cursorParam=${step.pagination.cursorParam || "cursor"}, cursorPath=${step.pagination.cursorPath || "$.nextCursor"}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Columns */}
              {Array.isArray(step.columnMappings) && step.columnMappings.length > 0 && (
                <div className="mt-4">
                  <div className="text-gray-700 font-semibold mb-2 text-sm">Mapped Columns</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-1 pr-3">Header</th>
                          <th className="py-1 pr-3">JSON Path</th>
                          <th className="py-1">Type</th>
                        </tr>
                      </thead>
                      <tbody className="align-top">
                        {step.columnMappings.map((c, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="py-1 pr-3 font-medium">{c.header}</td>
                            <td className="py-1 pr-3 font-mono break-all text-gray-700">{c.path}</td>
                            <td className="py-1 text-gray-600">{c.type || "text"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Filters */}
              {Array.isArray(step.filters) && step.filters.length > 0 && (
                <div className="mt-4">
                  <div className="text-gray-700 font-semibold mb-2 text-sm">Filters</div>
                  <ul className="list-disc pl-4 text-sm">
                    {step.filters.map((f, idx) => (
                      <li key={idx}>
                        <span className="font-medium">{getHeaderText(f.column)}</span>{" "}
                        <span className="text-gray-600">{f.operator}</span>{" "}
                        <code className="font-mono">{fmtVal(f.value)}</code>
                        {/* optional second value, e.g., between */}
                        {f.value2 != null && (
                          <>
                            {" "}and{" "}
                            <code className="font-mono">{fmtVal(f.value2)}</code>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
       
        </div>

        <div className="flex flex-col space-y-1 text-xs ml-2">
          <button onClick={() => setEditingStepId(step.id)} className="text-blue-600 hover:text-blue-800">Edit</button>
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
            <div ref={scrollRef} className="mt-6 border-t pt-4">
              <button
                disabled={resuming}
                onClick={handleContinueRecordingClick}
                className={`px-3 py-1 rounded text-white ${
                  resuming ? "bg-gray-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                }`}
                title="Replays to your last step and re-enters record mode"
              >
                {resuming ? "Resuming…" : "Continue Recording"}
              </button>
            </div>
          )}
        </div>

        {showSmartWizard && (
          <Modal onClose={handleCancelWizard}>
            <SmartStepWizard
              parentId={currentContainerId}
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
        {editingStepId && (
          (() => {
            const s = steps.find(st => st.id === editingStepId);
            const SMART_TYPES = new Set([
              "gridExtract","dataLoop","counterloop","exportData","importData","navigate","apiExtract"
            ]);
            return SMART_TYPES.has(s?.type)
              ? (
                  <SmartStepEditModal
                    step={s}
                    availableExtractSteps={steps.filter(x => ["gridExtract","apiExtract","keyValueExtract","keyValueCollect"].includes(x.type))}
                    onClose={handleCloseEditor}
                    onSave={handleSaveEditor}
                  />
                )
              : (
                  <StepEditorModal
                    step={s}
                    onClose={handleCloseEditor}
                    onSave={handleSaveEditor}
                  />
                );
          })()        
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
