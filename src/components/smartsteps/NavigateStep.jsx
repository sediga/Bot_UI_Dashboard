import React, { useMemo, useState } from "react";

/**
 * NavigateStep – config UI for a parameterized Navigate smart step.
 *
 * Props:
 * - onCreate(payload)   : function – called with the created step
 * - onBack()            : function – go back in the wizard
 * - onClose()           : function – close wizard (optional)
 * - parentId            : string|null – attach as child of this step (e.g., a dataLoop)
 * - availableExtractSteps: [{ id, name, columnMappings?: [{ header?: any, key?: string, field?: string }] }]
 */
export default function NavigateStep({ onCreate, onBack, onClose, parentId=null, availableExtractSteps=[], mode="create", initial=null }) {
  
  // form state
  const [stepName, setStepName] = useState("Navigate");
  const [navUrl, setNavUrl] = useState("");
  const [navTarget, setNavTarget] = useState("newTab");  // "newTab" | "newWindow"
  const [navWaitUntil, setNavWaitUntil] = useState("domcontentloaded");
  const [navTimeout, setNavTimeout] = useState(15000);

  // optional binding to dataset column from a prior extract
  const [bindSourceStepId, setBindSourceStepId] = useState("");
  const [bindColumn, setBindColumn] = useState("");

  const availableCols = useMemo(() => {
    const src = availableExtractSteps.find((s) => s.id === bindSourceStepId);
    const cols = (src?.columnMappings || []).map((c) => {
      if (typeof c?.header === "string") return c.header;
      return (
        c?.header?.header ||
        c?.header?.name ||
        c?.header?.key ||
        c?.key ||
        c?.field
      );
    });
    return (cols || []).filter(Boolean);
  }, [availableExtractSteps, bindSourceStepId]);

  const canSubmit =
    (navUrl.trim() || (bindSourceStepId && bindColumn)) && stepName.trim();

  const handleFinish = () => {
    const urlTemplate =
      bindSourceStepId && bindColumn
        ? `{{row.${bindColumn}}}`
        : navUrl.trim();

    if (!urlTemplate) return;

    const payload = {
      id: `navigate_${Date.now()}`,
      type: "navigate",
      name: stepName.trim() || "Navigate",
      url: urlTemplate,
      target: navTarget,
      waitUntil: navWaitUntil, // load | domcontentloaded | networkidle
      timeoutMs: Number(navTimeout) || 15000,
    };
    if (parentId) payload.parentId = parentId;

    onCreate?.(payload);
    onClose?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure Navigate</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Step Name</label>
          <input
            type="text"
            className="w-full border px-2 py-1 rounded"
            placeholder="e.g., Open Detail Page"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Open In</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={navTarget}
            onChange={(e) => setNavTarget(e.target.value)}
          >
            {/* <option value="sameTab">Same tab</option> */}
            <option value="newTab">New tab</option>
            <option value="newWindow">New window</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 font-medium">URL</label>
          <input
            type="text"
            className="w-full border px-2 py-1 rounded font-mono"
            placeholder="https://example.com/path or {{row.DetailURL}}"
            value={navUrl}
            onChange={(e) => setNavUrl(e.target.value)}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Tip: inside a data loop you can use <code>{'{{row.Column}}'}</code>.
          </p>
        </div>

        <div>
          <label className="block mb-1 font-medium">
            Bind to dataset column (optional)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="border px-2 py-1 rounded"
              value={bindSourceStepId}
              onChange={(e) => {
                setBindSourceStepId(e.target.value);
                setBindColumn("");
              }}
            >
              <option value="">-- Choose Extract Step --</option>
              {availableExtractSteps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id}
                </option>
              ))}
            </select>
            <select
              className="border px-2 py-1 rounded"
              value={bindColumn}
              onChange={(e) => setBindColumn(e.target.value)}
              disabled={!bindSourceStepId}
            >
              <option value="">-- Column --</option>
              {availableCols.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            If selected, URL becomes{" "}
            <code>{`{{row.${bindColumn || "Column"}}}`}</code>.
          </p>
        </div>

        <div>
          <label className="block mb-1 font-medium">Wait Until</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={navWaitUntil}
            onChange={(e) => setNavWaitUntil(e.target.value)}
          >
            <option value="domcontentloaded">domcontentloaded</option>
            <option value="load">load</option>
            <option value="networkidle">networkidle</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Timeout (ms)</label>
          <input
            type="number"
            className="w-full border px-2 py-1 rounded"
            min={1000}
            value={navTimeout}
            onChange={(e) =>
              setNavTimeout(parseInt(e.target.value || "0", 10))
            }
          />
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={onBack} className="text-sm text-gray-600">
          ← Back
        </button>
        <button
          onClick={handleFinish}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={!canSubmit}
        >
          Add Navigate Step
        </button>
      </div>
    </div>
  );
}
