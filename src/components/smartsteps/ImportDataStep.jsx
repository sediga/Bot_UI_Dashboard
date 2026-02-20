import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
// config is still used for API base if you later add "Preview from Agent" button,
// but in this version we don't call any agent endpoint.
import config from "../../config";

function applyTransforms(value, transforms = []) {
  let out = value == null ? "" : String(value);
  for (const t0 of transforms || []) {
    const t = String(t0 || "").trim().toLowerCase();
    if (!t) continue;
    if (t === "trim") out = out.trim();
    else if (t === "upper") out = out.toUpperCase();
    else if (t === "lower") out = out.toLowerCase();
    else if (t === "digits_only") out = out.replace(/\D+/g, "");
  }
  return out;
}

function applyListTransforms(values = [], transforms = []) {
  let out = [...(values || [])].map((x) => String(x ?? ""));
  for (const t0 of transforms || []) {
    const t = String(t0 || "").trim().toLowerCase();
    if (!t) continue;
    if (t === "trim") out = out.map((x) => x.trim());
    else if (t === "upper") out = out.map((x) => x.toUpperCase());
    else if (t === "lower") out = out.map((x) => x.toLowerCase());
    else if (t === "digits_only") out = out.map((x) => x.replace(/\D+/g, ""));
    else if (t === "dedupe") out = [...new Set(out)];
  }
  return out.filter((x) => x !== "");
}

function splitName(raw, part) {
  const tokens = String(raw || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return "";
  const p = String(part || "").toLowerCase();
  if (p === "first") return tokens[0] || "";
  if (p === "last") return tokens.length > 1 ? tokens[tokens.length - 1] : "";
  if (p === "middle") return tokens.length > 2 ? tokens.slice(1, -1).join(" ") : "";
  return String(raw || "");
}

function extractKeyValue(raw, label) {
  if (!raw || !label) return "";
  const re = new RegExp(`^\\s*${String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:\\:|-)\\s*(.+?)\\s*$`, "im");
  const m = String(raw).match(re);
  return m?.[1]?.trim() || "";
}

function renderTemplate(template, row) {
  const s = String(template || "");
  return s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => String(row?.[String(key).trim()] ?? ""));
}

function applyDerivedFieldsToRow(row, rules = []) {
  const out = { ...(row || {}) };
  for (const rule of rules || []) {
    if (!rule || typeof rule !== "object") continue;
    const name = String(rule.name || rule.target || "").trim();
    if (!name) continue;

    const op = String(rule.type || rule.op || "copy").trim().toLowerCase();
    const from = String(rule.from || rule.source || "").trim();
    const fallback = String(rule.default ?? "");
    let value = "";

    try {
      if (op === "constant") {
        value = String(rule.value ?? fallback);
      } else if (op === "template") {
        value = renderTemplate(rule.template, out) || fallback;
      } else if (op === "copy") {
        value = String(out[from] ?? fallback);
      } else if (op === "split") {
        const delim = String(rule.delimiter ?? " ");
        const idx = Number.isFinite(Number(rule.index)) ? Number(rule.index) : 0;
        const parts = String(out[from] ?? "").split(delim);
        value = String(parts[idx] ?? fallback).trim();
      } else if (op === "splitname") {
        value = splitName(out[from], rule.part) || fallback;
      } else if (op === "keyvalue" || op === "kv") {
        value = extractKeyValue(out[from], rule.label) || fallback;
      } else if (op === "regexextract" || op === "regex") {
        const pattern = String(rule.pattern || "");
        if (!pattern) value = fallback;
        else {
          const flags = String(rule.flags || "");
          const m = String(out[from] ?? "").match(new RegExp(pattern, flags));
          if (!m) value = fallback;
          else {
            const gi = Number.isFinite(Number(rule.group)) ? Number(rule.group) : 1;
            value = String(m[gi] ?? m[0] ?? fallback);
          }
        }
      } else if (op === "regexfindall" || op === "regex_find_all" || op === "regexall") {
        const pattern = String(rule.pattern || "");
        const source = String(out[from] ?? "");
        if (!pattern) value = fallback;
        else {
          const flagsRaw = String(rule.flags || "");
          const flags = flagsRaw.includes("g") ? flagsRaw : `${flagsRaw}g`;
          const re = new RegExp(pattern, flags);
          const gi = Number.isFinite(Number(rule.group)) ? Number(rule.group) : 1;
          const all = [...source.matchAll(re)]
            .map((m) => String(m?.[gi] ?? m?.[0] ?? ""))
            .filter(Boolean);
          const maxItems = Number.isFinite(Number(rule.maxItems)) ? Number(rule.maxItems) : 0;
          const clipped = maxItems > 0 ? all.slice(0, maxItems) : all;
          const list = applyListTransforms(clipped, rule.transforms || []);
          const output = String(rule.output || "csv").toLowerCase();
          if (output === "array") {
            out[name] = list;
            continue;
          }
          if (output === "json") {
            out[name] = JSON.stringify(list);
            continue;
          }
          const joinWith = String(rule.joinWith ?? ", ");
          value = list.join(joinWith) || fallback;
        }
      } else {
        value = fallback;
      }
    } catch {
      value = fallback;
    }

    out[name] = applyTransforms(value, rule.transforms || []);
  }
  return out;
}

function toFieldKey(input, fallback = "field") {
  const s = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || fallback;
}

function profileColumnKind(columnName, rows = []) {
  const header = String(columnName || "").toLowerCase();
  const vals = (rows || [])
    .map((r) => String(r?.[columnName] ?? "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const sample = vals.join("\n");
  const multilineRatio = vals.length ? vals.filter((v) => v.includes("\n")).length / vals.length : 0;
  const commaRatio = vals.length ? vals.filter((v) => v.includes(",")).length / vals.length : 0;
  const usZipHits = (sample.match(/\b\d{5}(?:-\d{4})?\b/g) || []).length;
  const stateHits = (sample.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/g) || []).length;
  const phoneHits = (sample.match(/\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g) || []).length;
  const dateHits = (sample.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || []).length;

  if (header.includes("address") || (usZipHits > 0 && (stateHits > 0 || commaRatio > 0))) return "address";
  if (header.includes("name") || header.includes("patient")) return "name";
  if (header.includes("phone") || phoneHits > 0) return "phone";
  if (header.includes("dob") || header.includes("date") || dateHits > 0) return "date";
  if (header.includes("member id") || header.includes("id") || header.includes("npi") || header.includes("ref")) return "identifier";
  if (header.includes("sns") || header.includes("notes") || multilineRatio > 0.25) return "multiline";
  return "unknown";
}

function buildDataDrivenSuggestions(columns = [], rows = []) {
  const out = [];
  for (const col of columns) {
    const kind = profileColumnKind(col, rows);
    const key = toFieldKey(col);

    if (kind === "name") {
      out.push({
        id: `name:${col}`,
        label: `Split name from '${col}'`,
        description: "Creates first_name and last_name",
        rules: [
          { name: "first_name", type: "splitName", from: col, part: "first", transforms: ["trim"] },
          { name: "last_name", type: "splitName", from: col, part: "last", transforms: ["trim"] },
        ],
      });
      continue;
    }

    if (kind === "address") {
      out.push({
        id: `address:${col}`,
        label: `Parse address from '${col}'`,
        description: "Creates line1/city/state/zip using regex heuristics",
        rules: [
          {
            name: "address_line1",
            type: "regexExtract",
            from: col,
            pattern: "^\\s*(.*?\\b(?:ST|STREET|RD|ROAD|DR|DRIVE|AVE|AVENUE|BLVD|BOULEVARD|LN|LANE|CT|COURT|CIR|CIRCLE|PKWY|PARKWAY|HWY|HIGHWAY|WAY|PL|PLACE|TER|TERRACE|TRL|TRAIL)\\b\\.?)\\s*,?\\s*[A-Za-z .'-]+\\s*,?\\s*[A-Z]{2}\\s*,?\\s*\\d{5}(?:-\\d{4})?\\s*$",
            group: 1,
            flags: "i",
            default: "",
            transforms: ["trim"],
          },
          {
            name: "address_city",
            type: "regexExtract",
            from: col,
            pattern: "^\\s*.*?\\b(?:ST|STREET|RD|ROAD|DR|DRIVE|AVE|AVENUE|BLVD|BOULEVARD|LN|LANE|CT|COURT|CIR|CIRCLE|PKWY|PARKWAY|HWY|HIGHWAY|WAY|PL|PLACE|TER|TERRACE|TRL|TRAIL)\\b\\.?\\s*,?\\s*([A-Za-z .'-]+?)\\s*,?\\s*[A-Z]{2}\\s*,?\\s*\\d{5}(?:-\\d{4})?\\s*$",
            group: 1,
            flags: "i",
            default: "",
            transforms: ["trim"],
          },
          {
            name: "address_state",
            type: "regexExtract",
            from: col,
            pattern: "\\b([A-Z]{2})\\s*,?\\s*\\d{5}(?:-\\d{4})?\\b",
            group: 1,
            flags: "i",
            default: "",
            transforms: ["upper"],
          },
          { name: "address_zip", type: "regexExtract", from: col, pattern: "\\b(\\d{5}(?:-\\d{4})?)\\b", group: 1, flags: "i" },
        ],
      });
      continue;
    }

    if (kind === "phone") {
      out.push({
        id: `phone:${col}`,
        label: `Normalize phone from '${col}'`,
        description: "Creates 10-digit phone value",
        rules: [{ name: `${key}_normalized`, type: "copy", from: col, transforms: ["digits_only"] }],
      });
      continue;
    }

    if (kind === "date") {
      out.push({
        id: `date:${col}`,
        label: `Use date from '${col}'`,
        description: "Creates clean date field (trimmed)",
        rules: [{ name: `${key}_normalized`, type: "copy", from: col, transforms: ["trim"] }],
      });
      continue;
    }

    if (kind === "multiline") {
      out.push({
        id: `multi:${col}`,
        label: `Custom parse from '${col}'`,
        description: "Adds empty regex stub; set field name + pattern",
        rules: [{ name: "", type: "regexExtract", from: col, pattern: "", group: 1, flags: "im", default: "" }],
      });
      continue;
    }

    out.push({
      id: `unknown:${col}`,
      label: `Unknown parse from '${col}'`,
      description: "Adds custom stub so you can name and parse",
      rules: [{ name: "", type: "regexExtract", from: col, pattern: "", group: 1, flags: "", default: "" }],
    });
  }
  return out;
}

const RULE_TYPE_OPTIONS = [
  { value: "copy", label: "copy" },
  { value: "split", label: "split" },
  { value: "splitName", label: "splitName" },
  { value: "keyValue", label: "keyValue" },
  { value: "regexExtract", label: "regexExtract" },
  { value: "regexFindAll", label: "regexFindAll" },
  { value: "template", label: "template" },
  { value: "constant", label: "constant" },
];

function normalizeRuleType(t) {
  const v = String(t || "").trim().toLowerCase();
  if (v === "kv") return "keyValue";
  if (v === "regex") return "regexExtract";
  if (v === "regexfindall" || v === "regex_find_all" || v === "regexall") return "regexFindAll";
  if (v === "splitname") return "splitName";
  if (v === "regexextract") return "regexExtract";
  if (v === "keyvalue") return "keyValue";
  if (v === "split") return "split";
  return v || "copy";
}

function ruleUiMeta(typeRaw) {
  const type = normalizeRuleType(typeRaw);
  if (type === "copy") {
    return {
      needsFrom: true,
      primaryLabel: null,
      showPart: false,
      showGroup: false,
      showFlags: false,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      help: "Copies source column as-is (or with transforms).",
    };
  }
  if (type === "split") {
    return {
      needsFrom: true,
      primaryLabel: "Delimiter",
      primaryKey: "delimiter",
      primaryPlaceholder: "e.g. ,",
      showPart: false,
      showGroup: false,
      showFlags: false,
      showDelimiter: true,
      showIndex: true,
      showTransforms: true,
      help: "Split source by delimiter and pick index.",
    };
  }
  if (type === "splitName") {
    return {
      needsFrom: true,
      primaryLabel: null,
      showPart: true,
      showGroup: false,
      showFlags: false,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      help: "Splits full name into first/middle/last.",
    };
  }
  if (type === "keyValue") {
    return {
      needsFrom: true,
      primaryLabel: "Label",
      primaryKey: "label",
      primaryPlaceholder: "e.g. MEMBER ID",
      showPart: false,
      showGroup: false,
      showFlags: false,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      help: "Extracts 'LABEL: value' from multiline text.",
    };
  }
  if (type === "regexExtract") {
    return {
      needsFrom: true,
      primaryLabel: "Pattern",
      primaryKey: "pattern",
      primaryPlaceholder: "e.g. REF\\s*NO\\s*:\\s*([A-Za-z0-9-]+)",
      showPart: false,
      showGroup: true,
      showFlags: true,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      help: "Regex match against source text.",
    };
  }
  if (type === "regexFindAll") {
    return {
      needsFrom: true,
      primaryLabel: "Pattern",
      primaryKey: "pattern",
      primaryPlaceholder: "e.g. \\b([A-Z]\\d{4})\\b",
      showPart: false,
      showGroup: true,
      showFlags: true,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      showListOutput: true,
      help: "Find all regex matches in source (single or list output).",
    };
  }
  if (type === "template") {
    return {
      needsFrom: false,
      primaryLabel: "Template",
      primaryKey: "template",
      primaryPlaceholder: "e.g. {{First Name}} {{Last Name}}",
      showPart: false,
      showGroup: false,
      showFlags: false,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      showListOutput: false,
      help: "Build value from columns using {{Column Name}}.",
    };
  }
  if (type === "constant") {
    return {
      needsFrom: false,
      primaryLabel: "Value",
      primaryKey: "value",
      primaryPlaceholder: "fixed value",
      showPart: false,
      showGroup: false,
      showFlags: false,
      showDelimiter: false,
      showIndex: false,
      showTransforms: true,
      showListOutput: false,
      help: "Static value for all rows.",
    };
  }
  return {
    needsFrom: true,
    primaryLabel: null,
    showPart: false,
    showGroup: false,
    showFlags: false,
    showDelimiter: false,
    showIndex: false,
    showTransforms: true,
    showListOutput: false,
    help: "",
  };
}

export default function ImportDataStep({ token, onCancel, onSave, onTest, mode="create", initial=null }) {
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
  const [derivedFields, setDerivedFields] = useState([]);

  // NEW: the real path used at runtime by the agent/player
  const [agentPath, setAgentPath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setStepName(initial.stepName || "Import Data");
    setAgentPath(initial.agentPath || "");
    setOriginalName(initial.originalName || "");
    setSheet(initial.sheet || "");
    setHeaderRow(initial.headerRow || 1);
    setFormat(initial.format || "xlsx");
    setDerivedFields(Array.isArray(initial.derivedFields) ? initial.derivedFields : []);
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

  function guessDefaultDir() {
    if (navigator.platform?.startsWith("Win")) return "C:\\Flowtra\\Data";
    return "/Users/<you>/Flowtra/data";
  }

  function looksLikeFilePath(v = "") {
    return /\.(xlsx|csv)$/i.test(String(v).trim());
  }

  function resolveRuntimePath(rawPath, fileName) {
    const pathVal = String(rawPath || "").trim();
    const nameVal = String(fileName || "").trim();
    if (!pathVal) return "";
    if (looksLikeFilePath(pathVal)) return pathVal;
    if (!nameVal) return "";
    return joinLike(pathVal, nameVal);
  }

  function replaceFileNameInPath(pathVal, fileName) {
    const p = String(pathVal || "").trim();
    if (!p) return fileName;
    if (!looksLikeFilePath(p)) return joinLike(p, fileName);
    return p.replace(/[/\\][^/\\]+$/, (m) => (m.includes("\\") ? `\\${fileName}` : `/${fileName}`));
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

    // UX: auto-update runtime path on file pick unless user manually edited path.
    if (!pathTouched) {
      const current = String(agentPath || "").trim();
      if (!current) {
        setAgentPath(joinLike(guessDefaultDir(), f.name));
      } else {
        setAgentPath(replaceFileNameInPath(current, f.name));
      }
    }

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
    const finalPath = resolveRuntimePath(agentPath, originalName || (file?.name || "data.xlsx"));
    if (!finalPath) {
      alert("Enter the file path on the agent that should be used at runtime.");
      return;
    }

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
        derivedFields: (derivedFields || []).filter((r) => String(r?.name || "").trim()),
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

  function updateRule(index, key, value) {
    const copy = [...derivedFields];
    copy[index] = { ...(copy[index] || {}), [key]: value };
    setDerivedFields(copy);
  }

  function getAvailableColumns() {
    return (preview?.columns || columns.map((c) => c.name)).filter(Boolean);
  }

  function guessColumn(candidates = []) {
    const cols = getAvailableColumns();
    const lower = cols.map((c) => ({ raw: c, l: String(c).toLowerCase() }));
    for (const cand of candidates) {
      const hit = lower.find((x) => x.l.includes(cand));
      if (hit) return hit.raw;
    }
    return cols[0] || "";
  }

  function removeRule(index) {
    const copy = [...derivedFields];
    copy.splice(index, 1);
    setDerivedFields(copy);
  }

  function addRule() {
    setDerivedFields((prev) => [
      ...prev,
      {
        name: "",
        type: "keyValue",
        from: (preview?.columns?.[0] || columns?.[0]?.name || ""),
        label: "",
        pattern: "",
        group: 1,
        part: "first",
        default: "",
        transforms: [],
      },
    ]);
  }

  function addPreset(kind) {
    const nameCol = guessColumn(["full name", "patient full name", "patient"]);
    const snsCol = guessColumn(["sns", "notes", "details"]);
    const addressCol = guessColumn(["address"]);
    const ruleByKind = {
      first_name: { name: "first_name", type: "splitName", from: nameCol, part: "first", default: "", transforms: ["trim"] },
      last_name: { name: "last_name", type: "splitName", from: nameCol, part: "last", default: "", transforms: ["trim"] },
      member_id: { name: "member_id", type: "keyValue", from: snsCol, label: "MEMBER ID", default: "", transforms: ["trim"] },
      insurance_plan: { name: "insurance_plan", type: "keyValue", from: snsCol, label: "INSURANCE PLAN", default: "", transforms: ["trim"] },
      ref_no: {
        name: "ref_no",
        type: "regexExtract",
        from: snsCol,
        pattern: "REF\\s*NO\\s*:\\s*([A-Za-z0-9-]+)",
        group: 1,
        flags: "im",
        default: "",
      },
      codes_list: {
        name: "codes_list",
        type: "regexFindAll",
        from: snsCol,
        pattern: "\\b([A-Z]\\d{4})\\b",
        group: 1,
        flags: "im",
        output: "csv",
        joinWith: ", ",
        maxItems: 0,
        default: "",
      },
      address_line1: {
        name: "address_line1",
        type: "regexExtract",
        from: addressCol,
        pattern: "^\\s*(.*?\\b(?:ST|STREET|RD|ROAD|DR|DRIVE|AVE|AVENUE|BLVD|BOULEVARD|LN|LANE|CT|COURT|CIR|CIRCLE|PKWY|PARKWAY|HWY|HIGHWAY|WAY|PL|PLACE|TER|TERRACE|TRL|TRAIL)\\b\\.?)\\s*,?\\s*[A-Za-z .'-]+\\s*,?\\s*[A-Z]{2}\\s*,?\\s*\\d{5}(?:-\\d{4})?\\s*$",
        group: 1,
        flags: "i",
        default: "",
        transforms: ["trim"],
      },
    };
    const rule = ruleByKind[kind];
    if (!rule) return;
    setDerivedFields((prev) => [...prev, rule]);
  }

  function addSuggestionRules(rules = []) {
    if (!Array.isArray(rules) || rules.length === 0) return;
    setDerivedFields((prev) => [...prev, ...rules]);
  }

  function rulePreview(row) {
    return applyDerivedFieldsToRow(row, derivedFields || []);
  }

  const dataDrivenSuggestions = buildDataDrivenSuggestions(
    getAvailableColumns(),
    preview?.rows || []
  );

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
            placeholder="C:\\Data\\DailyExports\\patients.xlsx  or  C:\\Data\\DailyExports"
            value={agentPath}
            onChange={(e) => {
              setAgentPath(e.target.value);
              setPathTouched(true);
            }}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            You can enter a full file path or just a folder. If folder is provided, the selected/uploaded file name is appended.
          </p>
          {!!resolveRuntimePath(agentPath, originalName || (file?.name || "")) && (
            <p className="mt-1 text-[11px] text-gray-500">
              Resolved runtime path: <code>{resolveRuntimePath(agentPath, originalName || (file?.name || ""))}</code>
            </p>
          )}
          {originalName && !looksLikeFilePath(agentPath) && (
            <p className="mt-1 text-[11px] text-blue-600">
              Selected filename: <code>{originalName}</code>
            </p>
          )}
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

      <div className="border rounded-lg">
        <div className="px-3 py-2 border-b text-xs font-semibold text-gray-700 flex items-center justify-between">
          <span>Derived Fields (Normalization)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRule}
              className="text-[11px] px-2 py-1 rounded border border-blue-300 text-blue-700"
            >
              + Add field
            </button>
          </div>
        </div>
        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {dataDrivenSuggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addSuggestionRules(s.rules)}
                title={s.description}
                className="text-[11px] px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50"
              >
                + {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addPreset("first_name")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ First Name</button>
            <button type="button" onClick={() => addPreset("last_name")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Last Name</button>
            <button type="button" onClick={() => addPreset("member_id")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Member ID</button>
            <button type="button" onClick={() => addPreset("insurance_plan")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Insurance Plan</button>
            <button type="button" onClick={() => addPreset("ref_no")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Ref No</button>
            <button type="button" onClick={() => addPreset("codes_list")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Codes List</button>
            <button type="button" onClick={() => addPreset("address_line1")} className="text-[11px] px-2 py-1 rounded border border-gray-300">+ Address Line1</button>
          </div>
          {derivedFields.length === 0 && (
            <p className="text-[11px] text-gray-500">No derived fields. Add rules to extract subfields like member ID, first name, last name.</p>
          )}
          {derivedFields.map((r, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 border rounded p-2 bg-gray-50">
              {(() => {
                const t = normalizeRuleType(r.type || "copy");
                const meta = ruleUiMeta(t);
                const primaryKey = meta.primaryKey || null;
                const primaryValue = primaryKey ? (r[primaryKey] || "") : "";
                const cols = getAvailableColumns();
                return (
                  <>
              <input
                className="md:col-span-2 rounded border border-gray-300 px-2 py-1 text-xs"
                placeholder="field_name"
                value={r.name || ""}
                onChange={(e) => updateRule(idx, "name", e.target.value)}
              />
              <select
                className="md:col-span-2 rounded border border-gray-300 px-2 py-1 text-xs"
                value={t}
                onChange={(e) => updateRule(idx, "type", e.target.value)}
              >
                {RULE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {meta.needsFrom ? (
                <select
                  className="md:col-span-2 rounded border border-gray-300 px-2 py-1 text-xs"
                  value={r.from || ""}
                  onChange={(e) => updateRule(idx, "from", e.target.value)}
                >
                  <option value="">from column</option>
                  {cols.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <div className="md:col-span-2 rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-500 flex items-center">
                  source not required
                </div>
              )}
              {primaryKey ? (
                <input
                  className="md:col-span-3 rounded border border-gray-300 px-2 py-1 text-xs"
                  placeholder={meta.primaryPlaceholder || ""}
                  value={primaryValue}
                  onChange={(e) => updateRule(idx, primaryKey, e.target.value)}
                />
              ) : (
                <div className="md:col-span-3 rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-500 flex items-center">
                  no extra value needed
                </div>
              )}
              <input
                className="md:col-span-2 rounded border border-gray-300 px-2 py-1 text-xs"
                placeholder="default"
                value={r.default || ""}
                onChange={(e) => updateRule(idx, "default", e.target.value)}
              />
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="md:col-span-12 text-[11px] text-gray-500">{meta.help}</div>

              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-2">
                {meta.showGroup ? (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="group (regex)"
                    value={r.group ?? 1}
                    onChange={(e) => updateRule(idx, "group", e.target.value)}
                  />
                ) : (
                  <div className="rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-400 flex items-center">group n/a</div>
                )}
                {meta.showPart ? (
                  <select
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={r.part || "first"}
                    onChange={(e) => updateRule(idx, "part", e.target.value)}
                  >
                    <option value="first">first</option>
                    <option value="middle">middle</option>
                    <option value="last">last</option>
                  </select>
                ) : (
                  <div className="rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-400 flex items-center">part n/a</div>
                )}
                {meta.showFlags ? (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="flags (regex, e.g. im)"
                    value={r.flags || ""}
                    onChange={(e) => updateRule(idx, "flags", e.target.value)}
                  />
                ) : (
                  <div className="rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-400 flex items-center">flags n/a</div>
                )}
                {meta.showDelimiter ? (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="delimiter"
                    value={r.delimiter ?? ""}
                    onChange={(e) => updateRule(idx, "delimiter", e.target.value)}
                  />
                ) : meta.showTransforms ? (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="transforms: trim,upper"
                    value={(r.transforms || []).join(",")}
                    onChange={(e) =>
                      updateRule(
                        idx,
                        "transforms",
                        String(e.target.value || "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                ) : (
                  <div className="rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-400 flex items-center">transforms n/a</div>
                )}
                {meta.showIndex ? (
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="index"
                    value={r.index ?? 0}
                    onChange={(e) => updateRule(idx, "index", e.target.value)}
                  />
                ) : null}
              </div>
              {meta.showListOutput ? (
                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    value={r.output || "csv"}
                    onChange={(e) => updateRule(idx, "output", e.target.value)}
                  >
                    <option value="csv">output: csv</option>
                    <option value="array">output: array</option>
                    <option value="json">output: json</option>
                  </select>
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="joinWith (csv output)"
                    value={r.joinWith ?? ", "}
                    onChange={(e) => updateRule(idx, "joinWith", e.target.value)}
                  />
                  <input
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                    placeholder="maxItems (0 = all)"
                    value={r.maxItems ?? 0}
                    onChange={(e) => updateRule(idx, "maxItems", e.target.value)}
                  />
                  <div className="rounded border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-400 flex items-center">
                    Use csv for form fields; array/json for downstream transforms.
                  </div>
                </div>
              ) : null}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {preview && derivedFields.length > 0 && (
        <div className="border rounded-lg">
          <div className="px-3 py-2 border-b text-xs font-semibold text-gray-700">
            Derived Preview (first 10 rows)
          </div>
          <div className="overflow-auto max-h-72">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {[...(preview.columns || []), ...derivedFields.map((r) => r.name).filter(Boolean)].map((c, i) => (
                    <th key={i} className="p-2 border-b text-left whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(preview.rows || []).slice(0, 10).map((row, rIdx) => {
                  const ext = rulePreview(row);
                  const headers = [...(preview.columns || []), ...derivedFields.map((r) => r.name).filter(Boolean)];
                  return (
                    <tr key={rIdx} className="even:bg-gray-50">
                      {headers.map((h, i) => (
                        <td key={i} className="p-2 border-b whitespace-nowrap">{String(ext[h] ?? "")}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onCancel} className="text-sm text-gray-600">← Back</button>
        <button
          onClick={handleSave}
          disabled={!resolveRuntimePath(agentPath, originalName || (file?.name || "")) || saving}
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
