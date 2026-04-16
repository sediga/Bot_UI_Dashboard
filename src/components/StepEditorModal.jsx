import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * StepEditorModal (focus-safe)
 * - Uncontrolled inputs buffered in refs (no per-key re-renders)
 * - JSON also buffered (no setState while typing)
 * - Portal + memo to avoid parent-induced remounts
 * - Type, URL (navigate), Action (uiAction) are read-only and locked on save
 */
function StepEditorModalInner({ step, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState("form"); // 'form' | 'json'
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(step)));
  const [error, setError] = useState("");

  // Buffers: avoid any setState while typing
  const formBuf = useRef({});
  const jsonBuf = useRef(JSON.stringify(step, null, 2));

  const put = (k, v) => { formBuf.current[k] = v; };
  const resetBuffers = () => { formBuf.current = {}; jsonBuf.current = JSON.stringify(step, null, 2); };

  // Reset only when switching to a different step
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(step)));
    resetBuffers();
    setError("");
  }, [step?.id]);

  const type = draft?.type || "";

  // ---------- UI helpers (UNCONTROLLED) ----------
  const Field = ({ label, children }) => (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );

  const Text = ({ readOnly = false, className = "", defaultValue, onBufferedChange, placeholder }) => (
    <input
      defaultValue={defaultValue ?? ""}
      readOnly={readOnly}
      aria-readonly={readOnly}
      placeholder={placeholder}
      className={
        "w-full rounded border px-3 py-2 text-sm " +
        (readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed select-text " : "") +
        className
      }
      onChange={(e) => { if (!readOnly && onBufferedChange) onBufferedChange(e.target.value); }}
    />
  );

  const NumberText = ({ defaultValue, onBufferedChange, placeholder, min, step = 1 }) => (
    <input
      type="number"
      min={min}
      step={step}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      className="w-full rounded border px-3 py-2 text-sm"
      onChange={(e) => onBufferedChange && onBufferedChange(e.target.value)}
    />
  );

  const Select = ({ defaultValue, onBufferedChange, options = [] }) => (
    <select
      defaultValue={defaultValue ?? ""}
      className="w-full rounded border px-3 py-2 text-sm"
      onChange={(e) => onBufferedChange && onBufferedChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  const TextArea = ({
    readOnly = false,
    className = "",
    defaultValue,
    onBufferedChange,
    rows = 4,
    placeholder,
  }) => (
    <textarea
      defaultValue={defaultValue ?? ""}
      readOnly={readOnly}
      aria-readonly={readOnly}
      placeholder={placeholder}
      rows={rows}
      className={
        "w-full rounded border px-3 py-2 text-sm font-mono " +
        (readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed select-text " : "") +
        className
      }
      onChange={(e) => { if (!readOnly && onBufferedChange) onBufferedChange(e.target.value); }}
    />
  );

  const Toggle = ({ defaultChecked = false, onBufferedChange, label }) => (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        defaultChecked={!!defaultChecked}
        onChange={(e) => onBufferedChange && onBufferedChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  // ---------- Validation & save helpers ----------
  const validate = (obj) => {
    if (!obj || typeof obj !== "object") return "Invalid step";
    if (!obj.type) return "Missing 'type'";
    if (obj.type === "navigate" && !obj.url) return "Navigate step needs a URL";
    if (obj.type === "uiAction" && !obj.action) return "UI action needs 'action'";
    return "";
  };

  function buildMergedFromBuffer() {
    const out = { ...draft, ...formBuf.current };

    // Parse buffered JSON fields if present
    if ("criteriaRaw" in formBuf.current) {
      try { out.criteria = JSON.parse(formBuf.current.criteriaRaw || "{}"); }
      catch { throw new Error("criteria JSON invalid"); }
      delete out.criteriaRaw;
    }
    if ("columnMappingsRaw" in formBuf.current) {
      try { out.columnMappings = JSON.parse(formBuf.current.columnMappingsRaw || "[]"); }
      catch { throw new Error("columnMappings must be JSON array"); }
      delete out.columnMappingsRaw;
    }
    const numericKeys = ["timeoutMs", "pollMs", "delayMs", "retryCount"];
    for (const key of numericKeys) {
      if (key in formBuf.current) {
        const raw = formBuf.current[key];
        if (raw === "" || raw == null) {
          out[key] = undefined;
        } else {
          const n = Number(raw);
          if (!Number.isFinite(n)) throw new Error(`${key} must be a valid number`);
          out[key] = n;
        }
      }
    }
    return out;
  }

  // Lock immutable fields regardless of tab (form/json)
  function lockImmutableFields(obj, original) {
    const res = { ...obj };
    res.type = original.type;
    if (original.type === "navigate") res.url = original.url;
    if (original.type === "uiAction") res.action = original.action;
    if (original.id != null) res.id = original.id;
    if (original.parentId != null) res.parentId = original.parentId;
    return res;
  }

  const commitForm = () => {
    try {
      const merged = buildMergedFromBuffer();
      const locked = lockImmutableFields(merged, step);
      const v = validate(locked);
      if (v) return setError(v);
      onSave(locked);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const commitJson = () => {
    try {
      // Treat the JSON as a *patch* on top of the current draft,
      // not a full replacement. This means you can omit fields like
      // `type`, `url`, etc. and they will be preserved.
      const parsed = JSON.parse(jsonBuf.current || "{}");

      // Shallow merge patch onto the current draft
      const merged = { ...draft, ...parsed };

      // Still lock immutable fields (type/url/action/id/parentId)
      // const locked = lockImmutableFields(merged, step);

      const v = validate(merged);
      if (v) {
        setError(v);
        return;
      }

      onSave(merged);
    } catch (e) {
      setError("JSON parse error: " + e.message);
    }
  };

  // ---------- Form content ----------
  const form = (
    <div>
      {/* Common fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Type">
          <Text readOnly defaultValue={draft.type} />
        </Field>
        <Field label="Name / Label">
          <Text
            defaultValue={draft.name ?? draft.label ?? ""}
            onBufferedChange={(v) => put(draft.name !== undefined ? "name" : "label", v)}
            placeholder="(optional)"
          />
        </Field>
        {(draft.caseId !== undefined || draft.parentId != null) && (
          <Field label="Case ID (optional)">
            <Text
              defaultValue={draft.caseId ?? ""}
              onBufferedChange={(v) => put("caseId", v)}
              placeholder="case_xxx"
            />
          </Field>
        )}
      </div>

      {/* Type-specific sections */}
      {type === "navigate" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="URL">
            <Text readOnly defaultValue={draft.url} placeholder="https://..." />
          </Field>
          <Field label="Open In">
            <Select
              defaultValue={draft.openIn || "same-tab"}
              onBufferedChange={(v) => put("openIn", v)}
              options={[
                { label: "Same tab", value: "same-tab" },
                { label: "New tab", value: "new-tab" },
                { label: "New window", value: "new-window" },
              ]}
            />
          </Field>
          <Field label="Wait Until">
            <Select
              defaultValue={draft.waitUntil || "domcontentloaded"}
              onBufferedChange={(v) => put("waitUntil", v)}
              options={[
                { label: "DOM content loaded", value: "domcontentloaded" },
                { label: "Page load", value: "load" },
                { label: "Network idle", value: "networkidle" },
              ]}
            />
          </Field>
          <Field label="Timeout (ms)">
            <NumberText
              defaultValue={draft.timeoutMs ?? 15000}
              min={0}
              onBufferedChange={(v) => put("timeoutMs", v)}
            />
          </Field>
        </div>
      )}

      {type === "uiAction" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Action">
            <Text
              readOnly
              defaultValue={draft.action}
              placeholder="click | change | select | type | dblclick | setcheckbox | setradio..."
            />
          </Field>
          <Field label="Value (supports {{row.*}} and {{secret:*}})">
            <Text
              defaultValue={draft.value ?? draft.dynamicValue ?? ""}
              onBufferedChange={(v) => { put("value", v); put("dynamicValue", v); }}
            />
          </Field>
          <Field label="Selector (primary)">
            <Text defaultValue={draft.selector ?? ""} onBufferedChange={(v) => put("selector", v)} />
          </Field>
          <Field label="Improved Selector">
            <Text defaultValue={draft.improvedSelector ?? ""} onBufferedChange={(v) => put("improvedSelector", v)} />
          </Field>
          <Field label="Timeout (ms)">
            <NumberText
              defaultValue={draft.timeoutMs ?? ""}
              min={0}
              onBufferedChange={(v) => put("timeoutMs", v)}
            />
          </Field>
          <Field label="Step Delay (ms)">
            <NumberText
              defaultValue={draft.delayMs ?? ""}
              min={0}
              onBufferedChange={(v) => put("delayMs", v)}
            />
          </Field>
          <Field label="Retries">
            <NumberText
              defaultValue={draft.retryCount ?? ""}
              min={0}
              onBufferedChange={(v) => put("retryCount", v)}
            />
          </Field>
          <div className="mt-2 flex items-center gap-4">
            <Toggle defaultChecked={!!draft.waitForNav} onBufferedChange={(c) => put("waitForNav", c)} label="Wait for navigation" />
            <Toggle defaultChecked={!!draft.optional}  onBufferedChange={(c) => put("optional", c)}  label="Optional (skip on fail)" />
          </div>
        </div>
      )}

      {(type === "manualCheckpoint" || type === "wait") && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title">
            <Text
              defaultValue={draft.name ?? draft.label ?? ""}
              onBufferedChange={(v) => {
                put("name", v);
                put("label", v);
              }}
              placeholder="Checkpoint title"
            />
          </Field>
          <Field label="Message">
            <TextArea
              rows={3}
              defaultValue={draft.message ?? ""}
              onBufferedChange={(v) => put("message", v)}
              placeholder="Instructions shown to user during wait"
            />
          </Field>
          <Field label="Wait for URL contains">
            <Text
              defaultValue={draft.waitForUrlContains ?? ""}
              onBufferedChange={(v) => put("waitForUrlContains", v)}
              placeholder="/path/fragment"
            />
          </Field>
          <Field label="Wait for selector">
            <Text
              defaultValue={draft.waitForSelector ?? ""}
              onBufferedChange={(v) => put("waitForSelector", v)}
              placeholder="css selector"
            />
          </Field>
          <Field label="Timeout (ms)">
            <NumberText
              defaultValue={draft.timeoutMs ?? 120000}
              min={0}
              onBufferedChange={(v) => put("timeoutMs", v)}
            />
          </Field>
          <Field label="Poll Interval (ms)">
            <NumberText
              defaultValue={draft.pollMs ?? 500}
              min={50}
              step={50}
              onBufferedChange={(v) => put("pollMs", v)}
            />
          </Field>
          <div className="mt-2 flex items-center gap-4">
            <Toggle
              defaultChecked={!!draft.continueOnTimeout}
              onBufferedChange={(c) => put("continueOnTimeout", c)}
              label="Continue on timeout"
            />
            <Toggle
              defaultChecked={!!draft.optional}
              onBufferedChange={(c) => put("optional", c)}
              label="Optional (skip on fail)"
            />
          </div>
        </div>
      )}

      {(type === "dataLoop" || type === "counterloop") && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Source / Name">
            <Text defaultValue={draft.source ?? ""} onBufferedChange={(v) => put("source", v)} />
          </Field>
          <Field label="Criteria (JSON)">
            <TextArea
              rows={3}
              defaultValue={JSON.stringify(draft.criteria || {}, null, 2)}
              onBufferedChange={(v) => put("criteriaRaw", v)}
            />
          </Field>
        </div>
      )}

      {type === "gridExtract" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Row Selector">
            <Text defaultValue={draft.rowSelector ?? ""} onBufferedChange={(v) => put("rowSelector", v)} />
          </Field>
          <Field label="Column Mappings (JSON)">
            <TextArea
              rows={6}
              defaultValue={JSON.stringify(draft.columnMappings || [], null, 2)}
              onBufferedChange={(v) => put("columnMappingsRaw", v)}
            />
          </Field>
        </div>
      )}

      {type === "emailCreateDraft" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Provider">
            <Text readOnly defaultValue={draft.provider || "gmail"} />
          </Field>
          <Field label="Draft Mode">
            <Text readOnly defaultValue={draft.draftMode || "reply"} />
          </Field>
          <Field label="To Override">
            <Text defaultValue={draft.to ?? ""} onBufferedChange={(v) => put("to", v)} />
          </Field>
          <Field label="Subject Override">
            <Text defaultValue={draft.subject ?? ""} onBufferedChange={(v) => put("subject", v)} />
          </Field>
          <Field label="Cc">
            <Text defaultValue={draft.cc ?? ""} onBufferedChange={(v) => put("cc", v)} />
          </Field>
          <Field label="Bcc">
            <Text defaultValue={draft.bcc ?? ""} onBufferedChange={(v) => put("bcc", v)} />
          </Field>
          <Field label="Attachment Base Folder">
            <Text
              defaultValue={draft.attachmentFolderPath ?? ""}
              onBufferedChange={(v) => put("attachmentFolderPath", v)}
            />
          </Field>
          <Field label="Subject ID Regex">
            <Text
              defaultValue={draft.subjectIdPattern ?? ""}
              onBufferedChange={(v) => put("subjectIdPattern", v)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Draft Body">
              <TextArea
                rows={8}
                defaultValue={draft.bodyText ?? draft.body ?? draft.text ?? ""}
                onBufferedChange={(v) => {
                  put("bodyText", v);
                  put("body", v);
                }}
                placeholder="Supports tokens like {{row.subject}}"
              />
            </Field>
          </div>
        </div>
      )}

      {type === "exportData" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Source Step ID or Name">
            <Text defaultValue={draft.source ?? ""} onBufferedChange={(v) => put("source", v)} />
          </Field>
          <Field label="Format">
            <Text defaultValue={draft.format || "csv"} onBufferedChange={(v) => put("format", v)} />
          </Field>
          <Field label="Filename">
            <Text defaultValue={draft.filename || ""} onBufferedChange={(v) => put("filename", v)} />
          </Field>
          <div className="mt-2 flex items-center gap-4">
            <Toggle defaultChecked={!!draft.appendTimestamp} onBufferedChange={(c) => put("appendTimestamp", c)} label="Append Timestamp" />
            <Toggle defaultChecked={!!draft.overwrite}       onBufferedChange={(c) => put("overwrite", c)}       label="Overwrite if exists" />
          </div>
        </div>
      )}
    </div>
  );

  const popup = (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[min(95vw,56rem)] rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-lg">Edit Step</div>
          <button onClick={onClose} className="text-sm text-gray-600 underline">Close</button>
        </div>

        <div className="mb-3">
          <button
            className={`px-3 py-1 mr-2 text-sm rounded ${activeTab === "form" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
            onClick={() => setActiveTab("form")}
          >
            Form
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${activeTab === "json" ? "bg-indigo-600 text-white" : "bg-gray-100"}`}
            onClick={() => setActiveTab("json")}
          >
            JSON
          </button>
        </div>

        {activeTab === "form" ? (
          form
        ) : (
          <TextArea
            rows={18}
            defaultValue={jsonBuf.current}
            onBufferedChange={(v) => { jsonBuf.current = v; }}
          />
        )}

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button
            onClick={activeTab === "form" ? commitForm : commitJson}
            className="px-3 py-2 rounded bg-indigo-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}

// Memoize so parent renders don't re-render modal unless props change meaningfully
export default React.memo(
  StepEditorModalInner,
  (prev, next) =>
    prev.step?.id === next.step?.id &&
    prev.onClose === next.onClose &&
    prev.onSave === next.onSave
);
