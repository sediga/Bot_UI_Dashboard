// src/components/smartsteps/KeyValueCollectWizard.jsx
import { useState, useMemo } from "react";
import config from "../../config";

export default function KeyValueCollectWizard({
  mode = "create",      // "create" | "edit"
  initial = null,       // { stepName, containerSelector, itemSelector, fields }
  onCreate,
  onCancel,
  parentId,
}) {
  const [stepName, setStepName] = useState(initial?.stepName || "");
  const [containerSelector, setContainerSelector] = useState(
    initial?.containerSelector ||
      initial?.selectors?.container ||
      ""
  );
  const [datasetId, setDatasetId] = useState(initial?.datasetId || "");
  const [itemSelector, setItemSelector] = useState(
    initial?.itemSelector ||
      initial?.selectors?.item ||
      ""
  );
  const [editStructure, setEditStructure] = useState(mode !== "edit");

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
        .map((f) => ({
          key: f.key.trim(),
          label: (f.label || f.key).trim(),
          valueSelector: f.valueSelector.trim(),
          type: f.type || "text",
        })),
    [fields]
  );

  const canSave =
    stepName.trim() &&
    containerSelector.trim() &&
    itemSelector.trim() &&
    normalizedFields.length > 0;

  const handleSave = () => {
    if (!canSave) return;

    const payload = {
      id: initial?.id || `kvCollect_${Date.now()}`,
      type: "keyValueCollect",
      action: "keyValueCollect",
      name: stepName.trim(),
      containerSelector: containerSelector.trim(),
      itemSelector: itemSelector.trim(),
      selectors: {
        container: containerSelector.trim(),
        item: itemSelector.trim(),
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

  // For now re-use the same agent test endpoint as keyValueExtract.
  // Backend can later use `itemSelector` to restrict to one panel/card.
  const callAgentTest = async ({ containerSelector, itemSelector, field, index }) => {
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
          itemSelector,
          field,
          index,
          mode: "collect-preview", // safe hint for future use
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
      !containerSelector.trim() ||
      !itemSelector.trim()
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
        itemSelector: itemSelector.trim(),
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
    !containerSelector.trim() ||
    !itemSelector.trim() ||
    !field?.valueSelector?.trim();

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure (Collect Key–Value Panels)</span>
      </div>

      {/* Name + selectors */}
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

        {(mode !== "edit" || editStructure) && (
          <div>
            <label className="block font-medium mb-1">
              Container selector
            </label>
            <input
              className="w-full border rounded px-2 py-1 font-mono text-xs"
              placeholder='e.g. "section.details-wrapper"'
              value={containerSelector}
              onChange={(e) => setContainerSelector(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Selector that wraps all key–value blocks (e.g., a details sidebar or a
              main content region).
            </p>
          </div>
        )}
      </div>

      {(mode !== "edit" || editStructure) && (
        <div>
          <label className="block font-medium mb-1">
            Item selector (per card/panel)
          </label>
          <input
            className="w-full border rounded px-2 py-1 font-mono text-xs"
            placeholder='e.g. ".detail-card" or "div[role=listitem]"'
            value={itemSelector}
            onChange={(e) => setItemSelector(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Each matching element is treated as one row in the collected output.
          </p>
        </div>
      )}

      {mode === "edit" && (
        <div className="rounded border bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div><strong>Container:</strong> <code>{containerSelector || "(not set)"}</code></div>
          <div><strong>Item:</strong> <code>{itemSelector || "(not set)"}</code></div>
          <button
            type="button"
            className="mt-2 text-xs text-blue-700 underline"
            onClick={() => setEditStructure((v) => !v)}
          >
            {editStructure ? "Hide structure fields" : "Edit structure fields"}
          </button>
        </div>
      )}

      {/* Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Fields to collect</span>
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
                    placeholder='Value selector inside each item, e.g. ".status span"'
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
                  <div className="text-xs text-green-600 ml-1">
                    Sample: <code>{state.value}</code>
                  </div>
                )}
                {state.status === "error" && (
                  <div className="text-xs text-red-600 ml-1">
                    {state.message || "Test failed"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 hover:underline"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`px-3 py-1 rounded text-sm font-medium ${
            canSave
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          Save step
        </button>
      </div>
    </div>
  );
}
