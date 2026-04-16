import { useEffect, useState } from "react";

function makeCase(index = 0) {
  const suffix = `${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: `case_${suffix}`,
    label: `Case ${index + 1}`,
    urlContains: "",
    isDefault: index === 0,
  };
}

export default function SwitchCaseStep({
  mode = "create",
  initial = null,
  onCreate,
  onCancel,
}) {
  const [stepName, setStepName] = useState("Switch Case");
  const [cases, setCases] = useState([makeCase(0), makeCase(1)]);

  useEffect(() => {
    if (!initial) return;
    setStepName(initial.stepName || initial.name || "Switch Case");
    if (Array.isArray(initial.cases) && initial.cases.length) {
      setCases(
        initial.cases.map((item, index) => ({
          id: item.id || makeCase(index).id,
          label: item.label || `Case ${index + 1}`,
          urlContains: item.urlContains || "",
          isDefault: !!item.isDefault,
        }))
      );
    }
  }, [initial]);

  const updateCase = (id, patch) => {
    setCases((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeCase = (id) => {
    setCases((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (!next.some((item) => item.isDefault) && next.length) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next;
    });
  };

  const addCase = () => {
    setCases((prev) => [...prev, makeCase(prev.length)]);
  };

  const setDefaultCase = (id) => {
    setCases((prev) => prev.map((item) => ({ ...item, isDefault: item.id === id })));
  };

  const normalizedCases = cases
    .map((item, index) => ({
      id: item.id || makeCase(index).id,
      label: String(item.label || `Case ${index + 1}`).trim() || `Case ${index + 1}`,
      urlContains: String(item.urlContains || "").trim(),
      isDefault: !!item.isDefault,
    }))
    .filter((item) => item.label);

  const hasValidCase = normalizedCases.some((item) => item.urlContains || item.isDefault);

  const handleSave = () => {
    const prepared = normalizedCases.length ? normalizedCases : [makeCase(0)];
    const payload = {
      id: initial?.id || `switchcase_${Date.now()}`,
      type: "switchCase",
      name: stepName.trim() || "Switch Case",
      label: "Switch Case: branch by URL",
      cases: prepared,
      timestamp: Date.now(),
    };
    onCreate?.(payload);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-blue-700">Step 2: Configure</div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Step name</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="Switch Case"
        />
      </div>

      <div className="rounded-md border border-gray-200 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-700">Cases</div>
          <button
            type="button"
            onClick={addCase}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
          >
            Add Case
          </button>
        </div>

        {cases.map((item, index) => (
          <div key={item.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Case label</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={item.label}
                  onChange={(e) => updateCase(item.id, { label: e.target.value })}
                  placeholder={`Case ${index + 1}`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL contains</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
                  value={item.urlContains}
                  onChange={(e) => updateCase(item.id, { urlContains: e.target.value })}
                  placeholder="example.com/path"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="radio"
                  name="switch-case-default"
                  checked={!!item.isDefault}
                  onChange={() => setDefaultCase(item.id)}
                />
                Default case
              </label>
              <button
                type="button"
                onClick={() => removeCase(item.id)}
                className="text-xs text-red-600 underline"
                disabled={cases.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="text-[11px] text-gray-500">
          Child steps added under this container will default to the first case. You can adjust branch assignment later by editing the child step JSON `caseId`.
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">Back</button>
        <button
          onClick={handleSave}
          disabled={!stepName.trim() || !hasValidCase}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
        >
          {mode === "edit" ? "Save Switch Case" : "Add Switch Case"}
        </button>
      </div>
    </div>
  );
}
