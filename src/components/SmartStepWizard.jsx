import { useEffect, useState } from "react";
import config from "../config";
import { getUniqueSelector } from "../utils/selectorutils";
import FilterBuilder from "./FilterBuilder";
import SMART_STEP_CONFIG from "../config/smartStepsConfig";
import ExportDataWizard from "./smartsteps/ExportDataWizard"

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
  const [loopCount, setLoopCount] = useState(3);
  const [selectedSource, setSelectedSource] = useState("");
  const [stepName, setStepName] = useState("");
  const [stepConfig, setStepConfig] = useState(null);
  const [fieldValues, setFieldValues] = useState({});

  const reset = () => {
    setStep(1);
    setStepType("");
    setIsPicking(false);
    setGridMeta(null);
    setSelectedColumns([]);
    setFilters([]);
    setLoopCount(3);
    setSelectedSource("");
    setStepName("");
  };

  const handleCancel = () => {
    if (isPicking) {
      fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
    }
    if (typeof onCancel === "function") onCancel();
    reset();
  };

const handleFinish = () => {
  let payload = null;

  if (stepType === "extract-grid" && gridMeta) {
    let gridSelector = gridMeta?.gridSelector;
    if (!gridSelector && gridMeta.outerHTML) {
      const el = document.createElement("div");
      el.innerHTML = gridMeta.outerHTML;
      const element = el.firstElementChild;
      if (element) gridSelector = getUniqueSelector(element);
    }

    const rowSelector = `${gridSelector} div[role='row']`;

    const columnMappings = (gridMeta.columnMappings || [])
      .filter(col => selectedColumns.includes(col.header.header))
      .map(col => ({
        ...col
      }));

    payload = {
      id: `extractStep_${Date.now()}`,
      type: "gridExtract",
      name: stepName,
      gridSelector,
      rowSelector,
      selectors: { grid: gridSelector, row: rowSelector },
      columnMappings,
      filters
    };
  } else if (stepType === "loop-counter") {
    payload = {
      id: `loopstep_${Date.now()}`,
      type: "counterloop",
      loopType: "counter",
      name: stepName,
      loopCount,
      actionsPerRow: []
    };
  } else if (stepType === "loop-dataset") {
    const sourceStep = availableExtractSteps.find(s => s.id === selectedSource);
    
    payload = {
      id: `dataloopStep_${Date.now()}`,
      type: "dataLoop",
      loopType: "dataset",
      name: stepName,
      source: selectedSource,
      actionsPerRow: []
    };

    fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopId: payload.id,
        loopName: payload.name,
        sourceStep: sourceStep // full gridExtract step
      })
    })
  } else if (stepType === "export-data") {
      const sourceStep = availableExtractSteps.find(s => s.id === selectedSource);
      if(!sourceStep) return;
      payload = {
        id: `dataexportStep_${Date.now()}`,
        type: "exportData",
        name: stepName,
        source: selectedSource,
        format,
        filename,
        appendTimestamp,
        overwrite,
        columns: selectedColumns,
        actionsPerRow: []  // Optional, if needed for further logic
      };
  }


  fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
  onSmartStepCreated(payload);
  reset();
};

  const startGridPick = async () => {
    setIsPicking(true);
    await fetch(`${config.agentServerUrl}/api/target-pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "start" }),
    });
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
    setSelectedColumns(prev =>
      prev.includes(colName)
        ? prev.filter(c => c !== colName)
        : [...prev, colName]
    );
  };

  const stepCard = (title, description, onClick, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border rounded-lg p-4 text-left shadow-sm hover:shadow-md transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : "bg-white"
      }`}
    >
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </button>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-sm font-semibold text-blue-700">Step 1: Choose Type</div>

      <div className="space-y-4">
        {SMART_STEP_CONFIG.map(({ category, emoji, steps }) => (
          <div key={category}>
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
              {emoji} {category}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {steps.map((s) =>
                stepCard(s.title, s.description, async () => {
                  setStepType(s.id);
                  setStepConfig(s);
                  setFieldValues({});
                  setStep(2);

                  if (s.agentMode === "target-pick") {
                    await startGridPick();
                  }
                })
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleCancel}
        className="text-sm text-red-600 underline mt-4 block"
      >
        Cancel
      </button>
    </div>
  );

  const renderExtractGrid = () => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 1: Choose Type</span>
        <span>Step 2: Configure</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2">Select Columns</label>

          <label className="flex items-center gap-2 mb-2 font-semibold">
            <input
              type="checkbox"
              checked={
                gridMeta.columnHeaders?.length > 0 &&
                selectedColumns.length === gridMeta.columnHeaders.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedColumns(gridMeta.columnHeaders.map(c => c.header));
                } else {
                  setSelectedColumns([]);
                }
              }}
            />
            Select All
          </label>

          {(gridMeta.columnHeaders || []).map(({ header }, idx) => (
            <label key={idx} className="flex items-center gap-2 mb-1 ml-4">
              <input
                type="checkbox"
                checked={selectedColumns.includes(header)}
                onChange={() => toggleColumn(header)}
              />
              {header}
            </label>
          ))}

        </div>

        <div>
          <label className="block font-medium mb-2">Step Name</label>
          <input
            type="text"
            className="w-full border px-2 py-1 rounded"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            placeholder="e.g., Extract Patients"
          />
        </div>
      </div>

      <div>
        <label className="block font-medium mb-1">Filters</label>
        <FilterBuilder
          columns={gridMeta.typedColumns || []}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(1)} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleFinish}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={selectedColumns.length === 0 || !stepName.trim()}
        >
          Save Step
        </button>
      </div>
    </div>
  );

  const renderLoopCounter = () => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 1: Choose Type</span>
        <span>Step 2: Configure</span>
      </div>

      <div>
        <label className="block mb-2">Loop Count</label>
        <input
          type="number"
          className="w-full border px-2 py-1 rounded"
          min={1}
          value={loopCount}
          onChange={(e) => setLoopCount(parseInt(e.target.value))}
        />
      </div>

      <div>
        <label className="block mb-2">Step Name</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
        />
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(1)} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleFinish}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={loopCount < 1 || !stepName.trim()}
        >
          Add Loop Step
        </button>
      </div>
    </div>
  );

  const renderLoopDataset = () => (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 1: Choose Type</span>
        <span>Step 2: Configure</span>
      </div>

      <div>
        <label className="block mb-2">Select Extract Step</label>
        <select
          className="w-full border px-2 py-1 rounded"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="">-- Choose --</option>
          {availableExtractSteps.map(step => (
            <option key={step.id} value={step.id}>
              {step.name || step.id} ({step.columnMappings?.map(c => c.header?.header).join(", ")})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">Step Name</label>
        <input
          type="text"
          className="w-full border px-2 py-1 rounded"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
        />
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(1)} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleFinish}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={!selectedSource || !stepName.trim()}
        >
          Add Loop Step
        </button>
      </div>
    </div>
  );

  const renderExportData = () => (
    <ExportDataWizard
      availableExtractSteps={availableExtractSteps}
      onCreate={(step) => {
        onSmartStepCreated(step);
        onCancel();
      }}
      onCancel={onCancel}
    />
  );

  return (
    <div className="space-y-4 text-sm relative z-10">
      {step === 1 && renderStep1()}
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
      {step === 2 && stepType === "extract-grid" && gridMeta && renderExtractGrid()}
      {step === 2 && stepType === "loop-counter" && renderLoopCounter()}
      {step === 2 && stepType === "loop-dataset" && renderLoopDataset()}
      {step === 2 && stepType === "export-data" && renderExportData()}
    </div>
  );
}
