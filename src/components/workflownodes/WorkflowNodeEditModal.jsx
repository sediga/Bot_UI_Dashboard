import Modal from "../SmartStepModal";
import WorkflowNodeForm from "./WorkflowNodeForm";

export default function WorkflowNodeEditModal({
  node,
  availableFlows = [],
  availableNodes = [],
  onClose,
  onSave,
}) {
  return (
    <Modal onClose={onClose}>
      <div className="text-sm">
        <div className="mb-3 font-semibold">Edit Workflow Node</div>
        <WorkflowNodeForm
          mode="edit"
          initialNode={node}
          availableFlows={availableFlows}
          availableNodes={availableNodes}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}
