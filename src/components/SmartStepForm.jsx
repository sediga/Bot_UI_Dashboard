import { useState, useEffect } from "react";
import SmartStepWizard from "./SmartStepWizard";

export default function SmartStepForm({ pickedTarget, onSmartStepCreated, setPickedTarget }) {
  const [showWizard, setShowWizard] = useState(false);
  const [internalTarget, setInternalTarget] = useState(null);

  useEffect(() => {
    if (pickedTarget?.type === "targetPicked") {
      setInternalTarget(pickedTarget);
      setShowWizard(true);
    }
  }, [pickedTarget]);

  const handleWizardComplete = (newStep) => {
    onSmartStepCreated(newStep);
    setShowWizard(false);
    setInternalTarget(null);
    setPickedTarget(null); // <-- This ensures modal closes
  };

  const handleCancel = () => {
    setShowWizard(false);
    setInternalTarget(null);
    setPickedTarget(null); // <-- This ensures modal closes
  };

  return (
    <>
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-lg">
            <SmartStepWizard
              pickedTarget={internalTarget}
              onSmartStepCreated={handleWizardComplete}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {!showWizard && (
        <div className="p-3 border rounded bg-white text-sm text-gray-600">
          Click “Add Smart Step” to begin.
        </div>
      )}
    </>
  );
}
