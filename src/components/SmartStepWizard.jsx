import { useEffect, useState } from "react";
import config from "../config";
import { getUniqueSelector } from "../utils/selectorutils";
import FilterBuilder from "./FilterBuilder";

export default function SmartStepWizard({ pickedTarget, onSmartStepCreated, onCancel }) {
  const [step, setStep] = useState(1);
  const [stepType, setStepType] = useState(""); // e.g., "grid"
  const [isPicking, setIsPicking] = useState(false);
  const [gridMeta, setGridMeta] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [rowAction, setRowAction] = useState("");

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

      setGridMeta({
        ...pickedTarget.metadata,
        typedColumns,
      });

      setStep(2);
    }
  }, [pickedTarget]);

  const toggleColumn = (colName) => {
    setSelectedColumns((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  };

  const buildCellSelector = (colIndex) => `div[role="gridcell"][data-colindex="${colIndex}"]`;

  const handleFinish = () => {
    let gridSelector = "";

    if (gridMeta?.gridSelector) {
      gridSelector = gridMeta.gridSelector;
    } else if (gridMeta?.outerHTML) {
      const tempContainer = document.createElement("div");
      tempContainer.innerHTML = gridMeta.outerHTML;
      const gridElement = tempContainer.firstElementChild;
      if (gridElement) {
        gridSelector = getUniqueSelector(gridElement);
      }
    }

    const rowSelector = `${gridSelector} div[role='row']`;

    const columnMappings = selectedColumns.map((headerName) => {
      const colIndex = gridMeta.columnHeaders.findIndex(col => col.header === headerName);
      return {
        header: headerName,
        columnIndex: colIndex,
        selector: `div[role="gridcell"][data-colindex="${colIndex}"]`,
      };
    });

    const actionsPerRow = [
      {
        action: rowAction,
        selector: "",
      },
    ];

    const stepPayload = {
      type: "dataLoop",
      gridSelector,
      rowSelector,
      columnMappings,
      filters,
      actionsPerRow,
    };

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
    if (typeof onCancel === "function") {
      onCancel();
    }
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
  };

  return (
    <div className="space-y-4 text-sm relative z-10">
      {step === 1 && (
        <div>
          <h3 className="text-md font-semibold mb-2">What type of smart step?</h3>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2"
            onClick={() => {
              setStepType("grid");
              startGridPick();
            }}
          >
            Data Grid Loop
          </button>

          <button
            className="bg-gray-500 text-white px-4 py-2 rounded w-full"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}

      {stepType === "grid" && isPicking && (
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

      {step === 2 && gridMeta && (
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

          <button
            onClick={() => setStep(3)}
            className="mt-3 bg-blue-600 text-white px-3 py-1 rounded"
            disabled={selectedColumns.length === 0}
          >
            Next: Define Action
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="font-medium">Step 3: Define Row Action</h3>
          <select
            className="w-full border px-2 py-1 rounded"
            value={rowAction}
            onChange={(e) => setRowAction(e.target.value)}
          >
            <option value="">-- Select Action --</option>
            <option value="click">Click Button in Row</option>
            <option value="open">Open Details Page</option>
            <option value="extract">Extract Data</option>
          </select>

          <div className="flex justify-between mt-4">
            <button
              onClick={handleCancel}
              className="bg-gray-400 text-white px-4 py-1 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleFinish}
              className="bg-green-600 text-white px-4 py-1 rounded"
              disabled={!rowAction}
            >
              Add Smart Step
            </button>
          </div>
        </>
      )}
    </div>
  );
}
