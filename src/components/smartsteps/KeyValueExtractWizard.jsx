// src/components/smartsteps/KeyValueExtractWizard.jsx
import { useState, useMemo } from "react";
import config from "../../config";

export default function KeyValueExtractWizard({
  mode = "create",      // "create" | "edit"
  initial = null,       // { stepName, containerSelector, fields }
  onCreate,
  onCancel,
  parentId,
}) {
  const [stepName, setStepName] = useState(initial?.stepName || "");
  const [containerSelector, setContainerSelector] = useState(
    initial?.containerSelector || initial?.selectors?.container || ""
  );

  const [fields, setFields] = useState(
    initial?.fields?.length
      ? initial.fields
      : [
          {
            key: "",
            label: "",
            valueSelector: "",
            type: "text",
          },
        ]
  );
  const [datasetId, setDatasetId] = useState(initial?.datasetId || "");
  // per-row test status: { [index]: { status, value?, message? } }
  const [testStates, setTestStates] = useState({});

  const token = useMemo(
    () => localStorage.getItem("botflows_token") || "",
    []
  );

  const updateField = (index, patch) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { key: "", label: "", valueSelector: "", type: "text" },
    ]);
  };

  const removeField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
    setTestStates((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const normalizedFields = useMemo(
    () =>
      fields
        .filter(
          (f) =>
            f.key?.trim() &&
            f.valueSelector?.trim()
        )
        .map((f, index) => ({
          key: f.key.trim(),
          label: (f.label || f.key).trim(),
          valueSelector: f.valueSelector.trim(),
          type: f.type || "text",
          index,
        })),
    [fields]
  );

  const canSave =
    stepName.trim() &&
    containerSelector.trim() &&
    normalizedFields.length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const payload = {
      id: initial?.id || `kvExtract_${Date.now()}`,
      type: "keyValueExtract",
      action: "keyValueExtract",
      name: stepName.trim(),
      containerSelector: containerSelector.trim(),
      selectors: {
        container: containerSelector.trim(),
      },
      fields: normalizedFields,
      headers: normalizedFields.map((f) => f.key),
      datasetId: datasetId || undefined,
    };

    if (parentId) {
      payload.parentId = parentId;
    }

    onCreate?.(payload);
  };

  const callAgentTest = async ({ containerSelector, field, index }) => {
    const res = await fetch(
      `${config.agentServerUrl}/api/smartsteps/test-keyvalue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          containerSelector,
          field,
          index,
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Agent test failed (${res.status})`);
    }

    const data = await res.json();
    // Expected shape: { ok: boolean, sampleValue?: string, error?: string }
    if (data.ok === false) {
      throw new Error(data.error || "Selector did not match inside container");
    }

    return data.sampleValue ?? "";
  };

  const handleTestField = async (index) => {
    const field = fields[index];

    if (
      !field?.valueSelector?.trim() ||
      !containerSelector.trim()
    ) {
      return;
    }

    setTestStates((prev) => ({
      ...prev,
      [index]: { status: "testing" },
    }));

    try {
      const sampleValue = await callAgentTest({
        containerSelector: containerSelector.trim(),
        field: {
          key: field.key?.trim(),
          label: (field.label || field.key || "").trim(),
          valueSelector: field.valueSelector.trim(),
          type: field.type || "text",
        },
        index,
      });

      setTestStates((prev) => ({
        ...prev,
        [index]: {
          status: "success",
          value: sampleValue ?? "",
        },
      }));
    } catch (err) {
      setTestStates((prev) => ({
        ...prev,
        [index]: {
          status: "error",
          message: err?.message || "Test failed",
        },
      }));
    }
  };

  const isTestDisabled = (field) =>
    !containerSelector.trim() || !field?.valueSelector?.trim();

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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


        <div>
          <label className="block font-medium mb-1">
            Container selector
          </label>
          <input
            className="w-full border rounded px-2 py-1 font-mono text-xs"
            placeholder='e.g. "table.details" or "section[role=region]"'
            value={containerSelector}
            onChange={(e) => setContainerSelector(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Selector that wraps the key–value section (table, definition
            list, sidebar panel, etc.).
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Fields to extract</span>
          <button
            type="button"
            onClick={addField}
            className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border"
          >
            + Add field
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const state = testStates[index] || {};
            const testing = state.status === "testing";

            return (
              <div key={index} className="space-y-1">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr),minmax(0,1.6fr),minmax(0,0.7fr),auto,auto] gap-2 items-center">
                  <input
                    className="border rounded px-2 py-1"
                    placeholder="Field key (Status, ProviderName, etc.)"
                    value={field.key}
                    onChange={(e) =>
                      updateField(index, { key: e.target.value })
                    }
                  />
                  <input
                    className="border rounded px-2 py-1 font-mono text-xs"
                    placeholder='Value selector, e.g. "tr:nth-child(4) td:nth-child(2)"'
                    value={field.valueSelector}
                    onChange={(e) =>
                      updateField(index, { valueSelector: e.target.value })
                    }
                  />
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={field.type || "text"}
                    onChange={(e) =>
                      updateField(index, { type: e.target.value })
                    }
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleTestField(index)}
                    disabled={isTestDisabled(field) || testing}
                    className="text-xs px-2 py-1 rounded border bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      state.status === "success"
                        ? state.value || "Test succeeded"
                        : state.status === "error"
                        ? state.message || "Test failed"
                        : ""
                    }
                  >
                    {testing
                      ? "Testing..."
                      : state.status === "success"
                      ? "Retest"
                      : "Test"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>

                {state.status === "success" && (
                  <div className="text-xs text-emerald-700">
                    Sample value:{" "}
                    <code className="font-mono break-all">
                      {state.value || "(empty)"}
                    </code>
                  </div>
                )}
                {state.status === "error" && (
                  <div className="text-xs text-red-600">
                    Test failed: {state.message || "Unable to read value"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          The <b>key</b> becomes the column/field name in your dataset.
          The <b>selector</b> should point to the value cell or span for
          that field.
        </p>
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600"
        >
          ← Back
        </button>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={!canSave}
          onClick={handleSave}
        >
          {mode === "edit" ? "Save Changes" : "Save Step"}
        </button>
      </div>
    </div>
  );
}
