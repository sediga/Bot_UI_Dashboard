import { useState } from "react";
import { StepCard } from "../StepCard";
import WORKFLOW_NODE_CONFIG from "../../config/workflowNodeConfig";
import { createWorkflowNode } from "../../utils/workflowNodes";
import WorkflowNodeForm from "./WorkflowNodeForm";

export default function WorkflowNodeWizard({
  availableFlows = [],
  availableNodes = [],
  onCreate,
  onCancel,
}) {
  const [step, setStep] = useState(1);
  const [nodeType, setNodeType] = useState("");

  const reset = () => {
    setStep(1);
    setNodeType("");
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <div className="space-y-4 text-sm">
      {step === 1 ? (
        <div className="space-y-5">
          <div className="text-sm font-semibold text-blue-700">Step 1: Choose Node Type</div>

          {WORKFLOW_NODE_CONFIG.map(({ category, emoji, steps }) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{emoji}</span>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{category}</h4>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((item) => (
                  <StepCard
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    emoji={item.emoji}
                    onClick={() => {
                      setNodeType(item.id);
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}

          <button onClick={handleCancel} className="text-sm text-red-600 underline">
            Cancel
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <WorkflowNodeForm
          mode="create"
          initialNode={createWorkflowNode(nodeType)}
          availableFlows={availableFlows}
          availableNodes={availableNodes}
          onSave={(payload) => {
            onCreate?.(payload);
            reset();
          }}
          onCancel={() => setStep(1)}
        />
      ) : null}
    </div>
  );
}
