import { useEffect, useState } from "react";
import config from "../config";
import { getUniqueSelector } from "../utils/selectorutils";
import FilterBuilder from "./FilterBuilder";

export default function SmartStepWizard({
  pickedTarget,
  onSmartStepCreated,
  onCancel,
  availableExtractSteps = []
}) {
  const [step, setStep] = useState(1);
  const [stepType, setStepType] = useState("");
  const [isPicking, setIsPicking] = useState(false);
  const [gridMeta, setGridMeta] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [rowAction, setRowAction] = useState("");
  const [loopCount, setLoopCount] = useState(3);
  const [selectedSource, setSelectedSource] = useState("");
  const [stepName, setStepName] = useState("");

  const startGridPick = async () => {
    setIsPicking(true);
    try {
      const res = await fetch(`${config.agentServerUrl}/api/target-pick-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "start" }),
      });
      if (!res.ok) {
        console.error("Failed to start grid pick mode:", res.statusText);
      }
    } catch (err) {
      console.error("Error starting grid pick mode:", err);
    }
  };

  useEffect(() => {
    if (pickedTarget?.type === "targetPicked") {
      setIsPicking(false);
      const typedColumns = pickedTarget.metadata?.columnHeaders || [];
      setGridMeta({ ...pickedTarget.metadata, typedColumns });
      setStep(2);
    }
  }, [pickedTarget]);

  const toggleColumn = (colName) => {
    setSelectedColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const handleFinish = () => {
    let stepPayload = null;

    if (stepType === "extract-grid") {
      let gridSelector = gridMeta?.gridSelector || "";
      if (!gridSelector && gridMeta?.outerHTML) {
        const temp = document.createElement("div");
        temp.innerHTML = gridMeta.outerHTML;
        const el = temp.firstElementChild;
        if (el) gridSelector = getUniqueSelector(el);
      }
      const rowSelector = `${gridSelector} div[role='row']`;

      const columnMappings = selectedColumns.map((headerName) => {
        const colIndex = gridMeta.columnHeaders.findIndex((col) => col.header === headerName);
        return {
          header: headerName,
          columnIndex: colIndex,
          selector: `div[role="gridcell"][data-colindex="${colIndex}"]`,
        };
      });

      stepPayload = {
        id: `extractStep_${Date.now()}`,
        type: "smartExtract",
        name: stepName,
        gridSelector,
        rowSelector,
        columnMappings,
        filters,
      };
    } else if (stepType === "loop-counter") {
      stepPayload = {
        id: `loopstep_${Date.now()}`,
        type: "loop",
        loopType: "counter",
        name: stepName,
        loopCount,
        steps: [],
      };
    } else if (stepType === "loop-dataset") {
      stepPayload = {
        id: `dataloopStep_${Date.now()}`,
        type: "loop",
        loopType: "dataset",
        name: stepName,
        source: selectedSource,
        steps: [],
      };
    }

    fetch(`${config.agentServerUrl}/api/target-pick-done`, {
      method: "POST",
    }).catch((err) => console.error("Failed to notify agent on cancel:", err));

    onSmartStepCreated(stepPayload);
    reset();
  };

  const handleCancel = () => {
    if (isPicking) {
      fetch(`${config.agentServerUrl}/api/target-pick-done`, {
        method: "POST",
      }).catch((err) => console.error("Failed to notify agent on cancel:", err));
    }
    if (typeof onCancel === "function") onCancel();
    reset();
  };

  const reset = () => {
    setStep(1);
    setStepType("");
    setIsPicking(false);
    setGridMeta(null);
    setSelectedColumns([]);
    setFilters([]);
    setRowAction("");
    setLoopCount(3);
    setSelectedSource("");
    setStepName("");
  };

  return (
    <div className="space-y-4 text-sm relative z-10">
      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-md font-semibold">What kind of smart step?</h3>

          <div className="space-y-2">
            <p className="font-medium text-sm">📥 Extract Data</p>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
              onClick={() => {
                setStepType("extract-grid");
                startGridPick();
              }}
            >
              From Data Grid
            </button>
            <button
              disabled
              className="bg-gray-300 text-gray-600 px-4 py-2 rounded w-full cursor-not-allowed"
            >
              From API (coming soon)
            </button>
          </div>

          <div className="space-y-2 mt-6">
            <p className="font-medium text-sm">🔁 Loop Over Data</p>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
              onClick={() => {
                setStepType("loop-counter");
                setStep(2);
              }}
            >
              Counter-Based Loop
            </button>
            <button
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
              onClick={() => {
                setStepType("loop-dataset");
                setStep(2);
              }}
            >
              Data-Driven Loop
            </button>
          </div>

          <button
            onClick={handleCancel}
            className="text-sm text-red-600 underline mt-4 block"
          >
            Cancel
          </button>
        </div>
      )}

      {stepType === "extract-grid" && isPicking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-lg font-semibold text-gray-800">
              Now click on the grid on the page…
            </p>
            <button
              onClick={handleCancel}
              className="text-sm text-red-600 underline hover:text-red-800"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 2 && stepType === "extract-grid" && gridMeta && (
        <>
          <h3 className="font-medium">Step 2: Select Columns</h3>
          <div className="grid grid-cols-2 gap-2">
            {(gridMeta.columnHeaders || []).map(({ header }, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(header)}
                  onChange={() => toggleColumn(header)}
                />
                {header}
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className="block font-medium mb-1">Filters</label>
            <FilterBuilder
              columns={gridMeta.typedColumns || []}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          <div className="mt-4">
            <label className="block mb-1 font-medium">Step Name</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g., Extract Pending Patients"
            />
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-600"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              className="bg-green-600 text-white px-4 py-1 rounded"
              disabled={selectedColumns.length === 0 || !stepName.trim()}
            >
              Save Extract Step
            </button>
          </div>
        </>
      )}

      {step === 2 && stepType === "loop-counter" && (
        <>
          <h3 className="font-medium">Step 2: Counter Loop</h3>
          <label className="block mb-2">How many times to loop?</label>
          <input
            type="number"
            className="w-full border px-2 py-1 rounded"
            min={1}
            value={loopCount}
            onChange={(e) => setLoopCount(parseInt(e.target.value))}
          />

          <div className="mt-4">
            <label className="block mb-1 font-medium">Step Name</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g., Retry 5 Times"
            />
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-600"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              className="bg-green-600 text-white px-4 py-1 rounded"
              disabled={loopCount < 1 || !stepName.trim()}
            >
              Add Loop Step
            </button>
          </div>
        </>
      )}

      {step === 2 && stepType === "loop-dataset" && (
        <>
          <h3 className="font-medium">Step 2: Data-Driven Loop</h3>
          <label className="block mb-2">Select Extract Step</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="">-- Choose --</option>
            {availableExtractSteps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.name || step.id} ({step.columnMappings?.map(c => c.header).join(", ")})
              </option>
            ))}
          </select>

          <div className="mt-4">
            <label className="block mb-1 font-medium">Step Name</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g., Loop Over Extracted Patients"
            />
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-600"
            >
              ← Back
            </button>
            <button
              onClick={handleFinish}
              className="bg-green-600 text-white px-4 py-1 rounded"
              disabled={!selectedSource || !stepName.trim()}
            >
              Add Loop Step
            </button>
          </div>
        </>
      )}
    </div>
  );
}
