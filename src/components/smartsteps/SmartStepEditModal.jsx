import React, { useMemo } from "react";
import Modal from "../SmartStepModal";
import SmartStepWizard from "../SmartStepWizard";
import ExportDataWizard from "./ExportDataWizard";
import ImportDataStep from "./ImportDataStep";
import NavigateStep from "./NavigateStep";
import GridExtractWizard from "./GridExtractWizard";
import CounterLoopWizard from "./CounterLoopWizard";
import DataLoopWizard from "./DataLoopWizard";
import ApiExtractWizard from "./ApiExtractWizard";
import KeyValueExtractWizard from "./KeyValueExtractWizard";
import KeyValueCollectWizard from "./KeyValueCollectWizard";

/**
 * SmartStepEditModal
 * Reuses your existing “create” components in an “edit” mode by
 * passing initial values and changing the final handler.
 *
 * Props:
 * - step
 * - availableExtractSteps
 * - onClose()
 * - onSave(updatedStep)
 * - pickedTarget   <-- (NEW) same feed you already pass to SmartStepWizard in create mode
 */
export default function SmartStepEditModal({
  step,
  availableExtractSteps = [],
  onClose,
  onSave,
  pickedTarget, // NEW
  onTestStep
}) {
  const type = step?.type;

  // Small helper so all children can trigger a test with the same signature
  const handleTest = (candidateStep) => {
    if (!onTestStep) return;
    // if child only passes partial updates, merge with original step
    const full = candidateStep
      ? { ...step, ...candidateStep, id: step.id, parentId: step.parentId }
      : step;
    onTestStep(full);
  };

  const initial = useMemo(() => {
    switch (type) {
      case "gridExtract": {
        const toHeader = (h) =>
          typeof h === "string"
            ? h
            : h?.header || h?.name || h?.key || step?.key || step?.field;

        return {
          stepName: step.name || step.label || "",
          gridMeta: {
            gridSelector: step.gridSelector || step.selectors?.grid,
            rowSelector: step.rowSelector || step.selectors?.row,
            columnHeaders:
              step.columnHeaders && step.columnHeaders.length
                ? step.columnHeaders
                : (step.columnMappings || []).map((c) => ({ header: toHeader(c.header) })),
            columnMappings: step.columnMappings || [],
          },
          selectedColumns: (step.columnMappings || []).map((c) => toHeader(c.header)),
          filters: step.filters || [],
          filterLogic: step.filterLogic || "AND",
        };
      }
      case "counterloop":
        return { stepName: step.name || "", loopCount: step.loopCount || 1 };
      case "dataLoop":
        return { stepName: step.name || "", selectedSource: step.source || "" };
      case "exportData":
        return {
          stepName: step.name || step.label || "",
          selectedSource: step.source || "",
          format: step.format || "csv",
          filename: step.filename || "export.csv",
          appendTimestamp: !!step.appendTimestamp,
          overwrite: !!step.overwrite,
          selectedColumns: step.columns || [],
        };
      case "importData":
        return {
          stepName: step.name || step.stepName || "Import Data",
          agentPathDir: (step.file?.path || "").replace(/[/\\][^/\\]+$/, ""),
          originalName: (step.file?.path || "").split(/[/\\]/).pop() || "",
          sheet: step.sheet || "",
          headerRow: step.headerRow || 1,
          columns: step.columns || [],
          format: step.format || "xlsx",
        };
      case "navigate":
        return {
          stepName: step.name || "Navigate",
          url: step.url || "",
          target: step.target || "newTab",
          waitUntil: step.waitUntil || "domcontentloaded",
          timeoutMs: step.timeoutMs || 15000,
        };
      case "keyValueExtract":
        return {
          id: step.id,
          stepName: step.name || step.label || "",
          containerSelector: step.containerSelector || step.selectors?.container || "",
          fields: Array.isArray(step.fields)
            ? step.fields
            : Array.isArray(step.config?.pairs)
            ? step.config.pairs
            : [],
          datasetId: step.datasetId || "",
        };
      case "keyValueCollect":
        return {
          id: step.id,
          stepName: step.name || step.label || "",
          containerSelector: step.containerSelector || step.selectors?.container || "",
          itemSelector: step.itemSelector || step.selectors?.item || "",
          fields: Array.isArray(step.fields) ? step.fields : [],
          datasetId: step.datasetId || "",
        };
      default:
        return {};
    }
  }, [step, type]);

  const applyAndSave = (updated) => {
    // Preserve identity/parent
    onSave({ ...step, ...updated, id: step.id, parentId: step.parentId });
  };

  let body = null;

  if (type === "gridExtract") {
    body = (
      <GridExtractWizard
        mode="edit"
        initial={initial}
        pickedTarget={pickedTarget}          // NEW: listen for agent pick
        onCreate={applyAndSave}              // (edit) returns full updated step payload
        onTest={handleTest}                  // NEW: forward test hook
        onCancel={onClose}
      />
    );
  } else if (type === "counterloop") {
        body = (
            <CounterLoopWizard
            mode="edit"
            initial={{ id: step.id, stepName: step.name, loopCount: step.loopCount }}
            onCreate={(updated) => onSave({ ...step, ...updated })}
            onTest={handleTest}                  // NEW: forward test hook
            onCancel={onClose}
            />
        );
        } else if (type === "dataLoop") {
        body = (
            <DataLoopWizard
            mode="edit"
            initial={{ id: step.id, stepName: step.name, selectedSource: step.source }}
            availableExtractSteps={availableExtractSteps}
            onCreate={(updated) => onSave({ ...step, ...updated })}
            onTest={handleTest}                  // NEW: forward test hook
            onCancel={onClose}
            />
        );
    } else if (type === "exportData") {
    body = (
      <ExportDataWizard
        availableExtractSteps={availableExtractSteps}
        mode="edit"
        initial={{
          stepName: initial.stepName,
          selectedSource: initial.selectedSource,
          format: initial.format,
          filename: initial.filename,
          appendTimestamp: initial.appendTimestamp,
          overwrite: initial.overwrite,
          selectedColumns: initial.selectedColumns,
        }}
        onCreate={applyAndSave}              // (edit) returns full updated step payload
        onTest={handleTest}                  // NEW: forward test hook
        onCancel={onClose}
      />
    );
  } else if (type === "importData") {
    body = (
      <ImportDataStep
        mode="edit"
        initial={{
          stepName: initial.stepName,
          agentPath: initial.agentPathDir,
          originalName: initial.originalName,
          sheet: initial.sheet,
          headerRow: initial.headerRow,
          columns: initial.columns,
          format: initial.format,
        }}
        onSave={applyAndSave}
        onTest={handleTest}                  // NEW: forward test hook
        onCancel={onClose}
      />
    );
  } else if (type === "navigate") {
    body = (
      <NavigateStep
        mode="edit"
        availableExtractSteps={availableExtractSteps}
        onCreate={applyAndSave}
        onTest={handleTest}                  // NEW: forward test hook
        onCancel={onClose}
        initial={{
          stepName: initial.stepName,
          url: initial.url,
          target: initial.target,
          waitUntil: initial.waitUntil,
          timeoutMs: initial.timeoutMs,
        }}
      />
    );
  } else if (type === "apiExtract") {
    body = (
      <ApiExtractWizard
        mode="edit"
        initial={{
          id: step.id,
          name: step.name,
          request: step.request,
          pagination: step.pagination,
          resultPath: step.resultPath,
          columnMappings: step.columnMappings,
          filters: Array.isArray(step.filters) ? step.filters : [] 
        }}
        onCreate={(updated) => onSave({ ...step, ...updated, id: step.id, parentId: step.parentId })}
        onTest={handleTest}                  // NEW: forward test hook
        onCancel={onClose}
      />
    );
  } else if (type === "keyValueExtract") {
    body = (
      <KeyValueExtractWizard
        mode="edit"
        initial={initial}
        onCreate={applyAndSave}
        onCancel={onClose}
      />
    );
  } else if (type === "keyValueCollect") {
    body = (
      <KeyValueCollectWizard
        mode="edit"
        initial={initial}
        onCreate={applyAndSave}
        onCancel={onClose}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="text-sm">
        <div className="font-semibold mb-3">Edit Smart Step</div>
        {body}
      </div>
    </Modal>
  );
}
