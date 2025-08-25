import { useState, useEffect, useRef } from "react";

const ExportDataWizard = ({ availableExtractSteps, onCreate, onCancel, setStep }) => {
const defaultFolder =
  navigator.platform.startsWith("Win")
    ? "C:\\Users\\<you>\\Documents\\Flowtra\\exports"
    : "/Users/<you>/Flowtra/exports";
  const [selectedSource, setSelectedSource] = useState("");
  const [filename, setFilename] = useState(`export.csv`);
  const [format, setFormat] = useState("csv");
  const [folderPath, setFolderPath] = useState("");
  const [appendTimestamp, setAppendTimestamp] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [stepName, setStepName] = useState("");

  const fakeFileRef = useRef();

  useEffect(() => {
    if (selectedSource) {
      const step = availableExtractSteps.find((s) => s.id === selectedSource);
      const headers = step?.headers || [];
      setAvailableColumns(headers);
      setSelectedColumns(headers);
    }
  }, [selectedSource]);

  // Auto-update file extension on format change
  useEffect(() => {
    if (!filename) return;
    const base = filename.replace(/\.[^/.]+$/, "");
    setFilename(`${base}.${format}`);
  }, [format]);

  const handleFolderBrowse = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/browse-folder", {
        method: "POST"
      });
      const data = await res.json();
      if (data?.path) setFolderPath(data.path);
    } catch (err) {
      alert("Could not open folder dialog. Is agent running?");
    }
  };

  const handleFakeFilePick = () => {
    fakeFileRef.current?.click();
  };

  const handleFilePicked = (e) => {
    const file = e.target.files[0];
    if (file?.name) {
      const base = file.name.replace(/\.[^/.]+$/, "");
      setFilename(`${base}.${format}`);
    }
  };

  const getFinalNamePreview = () => {
    if (!filename) return "";

    // Strip extension, we’ll add current format back
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const suffix = appendTimestamp
      ? `_${new Date().toISOString().replace(/[:.]/g, "-")}`
      : "";
    const finalName = `${baseName}${suffix}.${format}`;

    // If user typed path (has / or \), trust it; otherwise prepend default folder
    if (filename.includes("/") || filename.includes("\\")) {
      return finalName;
    } else {
      const sep = defaultFolder.includes("\\") ? "\\" : "/";
      return `${defaultFolder.replace(/[\\/]+$/, "")}${sep}${finalName}`;
    }
  };

  
  const handleSubmit = () => {
    if (!selectedSource || !filename || !stepName) return;

    onCreate({
      id: crypto.randomUUID(),
      type: "exportData",
      action: "exportData",
      source: selectedSource,
      format,
      filename,
      folderPath,
      appendTimestamp,
      overwrite,
      name: stepName || "Export Data",
      columns: selectedColumns,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure</span>
      </div>
      
      <div>
        <label className="block font-medium mb-1">Step Name:</label>
        <input
          type="text"
          className="border rounded p-2 w-full"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder="Give this export step a name"
        />
      </div>

      {/* Extract Step Picker */}
      <div>
        <label className="block font-medium mb-1">Select Extract Step:</label>
        <select
          className="border rounded p-2 w-full"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availableExtractSteps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.name || step.label || step.id}
            </option>
          ))}
        </select>
      </div>

      {/* Filename with simulated file picker */}
      <div>
        <label className="block font-medium mb-1">File path:</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g. export.csv"
          />
        </div>
        <input
          type="file"
          accept=".csv,.json"
          ref={fakeFileRef}
          style={{ display: "none" }}
          onChange={handleFilePicked}
        />
        {filename && (
          <div className="text-xs text-gray-500 mt-1">
            Final path: <code>{getFinalNamePreview()}</code>
          </div>
        )}
      </div>

      {/* Format Selector */}
      <div>
        <label className="block font-medium mb-1">Export Format:</label>
        <select
          className="border rounded p-2 w-full"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={appendTimestamp}
            onChange={(e) => {
              setAppendTimestamp(e.target.checked);
              if (e.target.checked) setOverwrite(false);
            }}
          />
          Append timestamp to filename
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => {
              setOverwrite(e.target.checked);
              if (e.target.checked) setAppendTimestamp(false);
            }}
          />
          Overwrite if file exists
        </label>
      </div>

      {/* Column Selector */}
      {availableColumns.length > 0 && (
        <div>
          <label className="block font-medium mb-1">Select Columns to Include:</label>
          <div className="flex flex-wrap gap-2">
            {availableColumns.map((col) => (
              <label key={col} className="inline-flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col)}
                  onChange={(e) => {
                    setSelectedColumns((prev) =>
                      e.target.checked
                        ? [...prev, col]
                        : prev.filter((c) => c !== col)
                    );
                  }}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between mt-4">
        <button onClick={() => setStep(1)} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-4 py-1 rounded"
          disabled={!selectedSource || !stepName.trim()}
        >
          Add Loop Step
        </button>
      </div>
    </div>
  );
};

export default ExportDataWizard;
