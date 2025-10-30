import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
// config is still used for API base if you later add "Preview from Agent" button,
// but in this version we don't call any agent endpoint.
import config from "../../config";

export default function ImportDataStep({ token, onCancel, onSave, mode="create", initial=null }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState(null); // "xlsx" | "csv"
  const [sheet, setSheet] = useState("");
  const [sheets, setSheets] = useState([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState(null);
  const [stepName, setStepName] = useState("Import Data");
  const [saving, setSaving] = useState(false);
  const [baseDir, setBaseDir] = useState("");
  const [originalName, setOriginalName] = useState("");

  // NEW: the real path used at runtime by the agent/player
  const [agentPath, setAgentPath] = useState("");

  useEffect(() => {
    if (!initial) return;
    setStepName(initial.stepName || "Import Data");
    setAgentPath(initial.agentPath || "");
    setOriginalName(initial.originalName || "");
    setSheet(initial.sheet || "");
    setHeaderRow(initial.headerRow || 1);
    setFormat(initial.format || "xlsx");
    if (Array.isArray(initial.columns) && initial.columns.length) {
      setColumns(initial.columns.map(n => ({ name: n })));
      setPreview({
        columns: initial.columns,
        rows: [], // optional; editing usually doesn’t need preview
      });
    }
  }, [initial]);
  
  function joinLike(dir, name) {
    if (!dir) return name;
    // if the user typed backslashes, prefer backslash; else use slash
    const sep = dir.includes("\\") && !dir.includes("/") ? "\\" : "/";
    return dir.replace(/[\\/]+$/, "") + sep + name;
  }

  async function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setOriginalName(f ? f.name : "");
    setFile(f);
    setPreview(null);
    setColumns([]);
    setSheets([]);
    setSheet("");

    if (!f) return;

    const isXlsx = /\.xlsx$/i.test(f.name);
    const isCsv = /\.csv$/i.test(f.name);
    if (!isXlsx && !isCsv) {
      alert("Only .xlsx or .csv files are supported.");
      return;
    }
    setFormat(isXlsx ? "xlsx" : "csv");

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const names = wb.SheetNames || [];
      const first = names[0] || "Sheet1";
      setSheets(names.length ? names : [first]);
      setSheet(first);

      buildPreviewFromSheet(wb, first, headerRow);
    } catch (err) {
      console.error(err);
      alert("Failed to read file. Please check the format.");
    }
  }

  function buildPreviewFromSheet(wb, sheetName, headerIndex1Based) {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    const hdrIdx = Math.max(1, headerIndex1Based) - 1;
    const headerArr = (rows[hdrIdx] || []).map((h) => String(h || "").trim());
    const dataRows = rows.slice(hdrIdx + 1);

    const colNames = headerArr.length
      ? headerArr
      : Array.from({ length: (dataRows[0] || []).length }, (_, i) => `Column${i + 1}`);

    setColumns(colNames.map((n) => ({ name: n || "Column" })));

    const previewRows = dataRows.slice(0, 20).map((arr) => {
      const obj = {};
      colNames.forEach((n, i) => {
        const key = n || `Column${i + 1}`;
        obj[key] = arr[i];
      });
      return obj;
    });

    setPreview({ columns: colNames, rows: previewRows });
  }

  useEffect(() => {
    if (!file || !sheet) return;
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        buildPreviewFromSheet(wb, sheet, headerRow);
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerRow, sheet]);

  function renameColumn(index, newName) {
    const copy = [...columns];
    copy[index] = { name: newName };
    setColumns(copy);

    if (!preview) return;
    const newCols = [...preview.columns];
    newCols[index] = newName;

    const remappedRows = preview.rows.map((row) => {
      const newRow = {};
      preview.columns.forEach((oldName, i) => {
        const val = row[oldName];
        const targetName = newCols[i];
        newRow[targetName] = val;
      });
      return newRow;
    });

    setPreview({ columns: newCols, rows: remappedRows });
  }

  async function handleSave() {
    // ✅ Save only the *agentPath* so the player always opens the latest file on disk.
    if (!agentPath) {
      alert("Enter the file path on the agent that should be used at runtime.");
      return;
    }
    const finalPath =
      agentPath?.trim()
        ? joinLike(agentPath.trim(), originalName || (file?.name || "data.xlsx"))
        : agentPath;

    // pick a format if not set (e.g., user skipped upload/preview)
    const effectiveFormat = format || guessFormat(finalPath) || "xlsx";

    setSaving(true);
    try {
      const step = {
        id: crypto.randomUUID(),
        type: "importData",
        action: "importData",
        name: stepName || "Import Data",
        stepName: stepName || "Import Data",
        file: { kind: "local", path: finalPath }, // ← persisted path (live file)
        format: effectiveFormat,                  // "xlsx" | "csv"
        sheet,                                    // optional for CSV
        headerRow,                                // 1-based
        columns: columns.map((c) => c.name),       // from preview; can be empty if no preview
        timestamp: Date.now(),
      };

      onSave(step);
    } catch (e) {
      console.error(e);
      alert("Failed to save import step.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-blue-700 font-semibold">
        <span>Step 2: Configure</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Step name</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
            placeholder="Import Data"
          />
        </div>

        {/* NEW: Agent file path used at runtime */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            File path on agent (used at runtime)
          </label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="C:\\Data\\DailyExports\\patients.xlsx"
            value={agentPath}
            onChange={(e) => setAgentPath(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            This path is saved in the step. The player will open this file each run so it always uses the latest contents.
          </p>
        </div>

        {/* Optional: upload purely for preview/template */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Upload for preview (optional)</label>
          <input type="file" accept=".xlsx,.csv" onChange={onFileChange} className="w-full text-sm" />
          <p className="mt-1 text-[11px] text-gray-500">
            Upload is only to preview and rename columns. The saved step still uses the agent path above.
          </p>
        </div>

        {sheets.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sheet</label>
            <select
              value={sheet}
              onChange={(e) => setSheet(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {sheets.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Header row</label>
          <input
            type="number"
            min={1}
            value={headerRow}
            onChange={(e) => setHeaderRow(parseInt(e.target.value || "1", 10))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {preview && (
        <div className="border rounded-lg">
          <div className="px-3 py-2 border-b text-xs font-semibold text-gray-700">
            Preview (first 20 rows)
          </div>
          <div className="overflow-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {preview.columns.map((c, i) => (
                    <th key={i} className="p-2 border-b">
                      <input
                        className="w-40 rounded border border-gray-300 px-2 py-1"
                        value={columns[i]?.name || c}
                        onChange={(e) => renameColumn(i, e.target.value)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="even:bg-gray-50">
                    {preview.columns.map((c, i) => (
                      <td key={i} className="p-2 border-b whitespace-nowrap">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleSave}
          disabled={!agentPath || saving}
          className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >
          Save Import Step
        </button>
      </div>
    </div>
  );
}

function guessFormat(name) {
  if (/\.xlsx$/i.test(name)) return "xlsx";
  if (/\.csv$/i.test(name)) return "csv";
  return null;
}
