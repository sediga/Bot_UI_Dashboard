import { useEffect, useState } from "react";
import config from "../config";
// getUniqueSelector & FilterBuilder are no longer used here after extraction
import SMART_STEP_CONFIG from "../config/smartStepsConfig";
import ExportDataWizard from "./smartsteps/ExportDataWizard";
import { StepCard } from "./StepCard";
import ImportDataStep from "./smartsteps/ImportDataStep";
import NavigateStep from "./smartsteps/NavigateStep.jsx";
import GridExtractWizard from "./smartsteps/GridExtractWizard";
import CounterLoopWizard from "./smartsteps/CounterLoopWizard";
import DataLoopWizard from "./smartsteps/DataLoopWizard";

export default function SmartStepWizard({
  parentId,
  pickedTarget,
  onSmartStepCreated,
  onCancel,
  availableExtractSteps = [],
}) {
  const [step, setStep] = useState(1);
  const [stepType, setStepType] = useState("");

  // Keep local state only for flows still handled inline here
  const [isPicking, setIsPicking] = useState(false);
  const [gridMeta, setGridMeta] = useState(null);

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
    setLoopCount(3);
    setSelectedSource("");
    setStepName("");
    setStepConfig(null);
    setFieldValues({});
  };

  const handleCancel = () => {
    if (isPicking) {
      fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
    }
    if (typeof onCancel === "function") onCancel();
    reset();
  };

  // ---------- Extract Grid: pick target in Step 1 ----------
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
      setStep(2); // proceed to configure (handled by GridExtractWizard)
    }
  }, [pickedTarget]);

  // ---------- Shared finisher for inline steps (loops) ----------
  const handleFinish = () => {
    let payload = null;

    if (stepType === "loop-counter") {
      payload = {
        id: `loopstep_${Date.now()}`,
        type: "counterloop",
        loopType: "counter",
        name: stepName,
        loopCount,
        actionsPerRow: [],
      };
    } else if (stepType === "loop-dataset") {
      const sourceStep = availableExtractSteps.find((s) => s.id === selectedSource);

      payload = {
        id: `dataloopStep_${Date.now()}`,
        type: "dataLoop",
        loopType: "dataset",
        name: stepName,
        source: selectedSource,
        actionsPerRow: [],
      };

      if (parentId && !["loop", "dataLoop", "counterloop", "gridLoop"].includes(payload.type)) {
        payload.parentId = parentId;
      }

      // notify agent to start loop recording
      fetch(`${config.agentServerUrl}/api/start-loop-recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loopId: payload.id,
          loopName: payload.name,
          sourceStep, // full gridExtract step
        }),
      });
    }

    // For extract-grid, payload is built by GridExtractWizard, so nothing here.

    if (payload) {
      fetch(`${config.agentServerUrl}/api/target-pick-done`, { method: "POST" });
      onSmartStepCreated(payload);
      reset();
    }
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
    <div className="space-y-5">
      <div className="text-sm font-semibold text-blue-700">Step 1: Choose Type</div>

      {SMART_STEP_CONFIG.map(({ category, emoji, steps }) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{emoji}</span>
            <h4 className="text-[11px] font-bold tracking-wide uppercase text-gray-500">
              {category}
            </h4>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {steps.map((s) => (
              <StepCard
                key={s.id}
                title={s.title}
                description={s.description}
                emoji={s.emoji}
                disabled={s.disabled}
                comingSoon={s.comingSoon}
                onClick={async () => {
                  if (s.disabled) return;
                  setStepType(s.id);
                  setStepConfig(s);
                  setFieldValues({});
                  setStep(2);
                  if (s.agentMode === "target-pick") await startGridPick();
                }}
              />
            ))}
          </div>
        </section>
      ))}

      <button onClick={handleCancel} className="text-sm text-red-600 underline mt-2">
        Cancel
      </button>
    </div>
  );

  const renderExtractGrid = () => (
    <GridExtractWizard
      mode="create"
      initial={{
        stepName,
        gridMeta,            // comes from pick result
        selectedColumns: [], // choose manually by default
        filters: [],
      }}
      onCreate={(payload) => {
        // finalize via parent pipeline
        onSmartStepCreated(payload);
        onCancel(); // keep consistent behavior with other wizards
      }}
      onCancel={() => setStep(1)}
    />
  );

  const renderLoopCounter = () => (
    <CounterLoopWizard
      mode="create"
      onCreate={(payload) => { onSmartStepCreated(payload); onCancel(); }}
      onCancel={() => setStep(1)}
    />
  );

  const renderLoopDataset = () => (
    <DataLoopWizard
      mode="create"
      availableExtractSteps={availableExtractSteps}
      onCreate={(payload) => { onSmartStepCreated(payload); onCancel(); }}
      onCancel={() => setStep(1)}
    />
  );

  const renderExportData = () => (
    <ExportDataWizard
      availableExtractSteps={availableExtractSteps}
      onCreate={(step) => {
        onSmartStepCreated(step);
        onCancel();
      }}
      onCancel={onCancel}
      setStep={setStep}
    />
  );

  const renderImportExcelData = () => (
    <ImportDataStep
      token={localStorage.getItem("botflows_token") || ""}
      onCancel={() => setStep(1)}
      onSave={(step) => {
        try {
          onSmartStepCreated(step);
        } catch (e) {
          console.error("onSmartStepCreated failed:", e);
        }
        setStep(1);
      }}
    />
  );

  const renderNavigate = () => (
    <NavigateStep
      availableExtractSteps={availableExtractSteps}
      parentId={parentId}
      onCreate={(step) => {
        onSmartStepCreated(step);
        onCancel(); // keep consistent
      }}
      onCancel={onCancel}
      setStep={setStep}
    />
  );

  return (
    <div className="space-y-4 text-sm relative z-10">
      {step === 1 && renderStep1()}

      {/* Extract Grid picking overlay */}
      {stepType === "extract-grid" && isPicking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-lg font-semibold text-gray-800">Now click on the grid on the page…</p>
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

      {/* Step 2 bodies */}
      {step === 2 && stepType === "extract-grid" && gridMeta && renderExtractGrid()}
      {step === 2 && stepType === "loop-counter" && renderLoopCounter()}
      {step === 2 && stepType === "loop-dataset" && renderLoopDataset()}
      {step === 2 && stepType === "export-data" && renderExportData()}
      {step === 2 && stepType === "import-excel" && renderImportExcelData()}
      {step === 2 && stepType === "navigate" && renderNavigate()}
    </div>
  );
}
