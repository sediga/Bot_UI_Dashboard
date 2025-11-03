import { useEffect, useMemo, useState } from "react";
import config from "../../config";
import FilterBuilder from "../FilterBuilder";

const TYPE_OPTIONS = ["text", "number", "date", "boolean"];

// Small helper to walk a simple "a.b.c" or JSON Pointer-like "/a/b" path.
function pickItems(obj, path) {
  if (!path) return obj;
  if (path.startsWith("/")) {
    // JSON Pointer /a/b/c
    return path
      .split("/")
      .filter(Boolean)
      .reduce((acc, k) => (acc ? acc[k] : undefined), obj);
  }
  // dot path a.b.c
  return path
    .split(".")
    .filter(Boolean)
    .reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function kvRowsToObject(rows) {
  const obj = {};
  (rows || []).forEach(({ key, value }) => {
    if (!key) return;
    obj[key] = value ?? "";
  });
  return obj;
}

function addRow(setter) {
  setter((r) => [...r, { key: "", value: "" }]);
}
function updateRow(setter, idx, patch) {
  setter((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
}
function removeRow(setter, idx) {
  setter((r) => r.filter((_, i) => i !== idx));
}

// Resolve arrays in common styles: JSONPath-ish ("$.a.b" or "a.b"),
// JSON Pointer ("/a/b"), or leave as whole JSON if empty.
function pluckArray(json, path) {
  if (!path) return Array.isArray(json) ? json : [];
  try {
    // Strip common prefixes
    let p = path.trim();
    if (p.startsWith("$.") || p.startsWith("$")) p = p.replace(/^\$\.?/, "");
    if (p.startsWith("/")) {
      // JSON Pointer
      const parts = p.split("/").filter(Boolean);
      let cur = json;
      for (const seg of parts) cur = cur?.[seg];
      return Array.isArray(cur) ? cur : [];
    } else {
      // Dot path
      const parts = p.split(".").filter(Boolean);
      let cur = json;
      for (const seg of parts) cur = cur?.[seg];
      return Array.isArray(cur) ? cur : [];
    }
  } catch {
    return [];
  }
}

export default function ApiExtractWizard({
  mode = "create",       // "create" | "edit"
  initial = null,        // optional initial step data
  onCreate,              // (payload) => void
  onCancel,
}) {
  // ----- Step name -----
  const [stepName, setStepName] = useState(initial?.stepName || initial?.name || "");

  // ----- Request basics -----
  const [method, setMethod] = useState(initial?.request?.method || "GET");
  const [url, setUrl] = useState(initial?.request?.url || "");

  // Default headers (added once on first load; user can delete them)
  const [headers, setHeaders] = useState(() => {
    const existing =
      Object.entries(initial?.request?.headers || {}).map(([key, value]) => ({ key, value })) || [];

    // We add a few helpful defaults. If the user already provided any, don't duplicate.
    const defaults = [
      { key: "Accept", value: "application/json" },
      // Having Content-Type on GET is harmless for most APIs; user can delete it.
      { key: "Content-Type", value: "application/json" },
      { key: "Authorization", value: "Bearer {{secret:api_token}}" },
    ];
    const have = new Set(
      existing.map(h => (h.key || "").toLowerCase()).filter(Boolean)
    );
    const merged = [...existing, ...defaults.filter(d => !have.has(d.key.toLowerCase()))];
    return merged.length ? merged : defaults;
  });

  const [query, setQuery] = useState(
    Object.entries(initial?.request?.query || {}).map(([key, value]) => ({ key, value })) || []
  );
  const [body, setBody] = useState(
    initial?.request?.body ? JSON.stringify(initial?.request?.body, null, 2) : ""
  );

  // ----- Pagination -----
  const [pgMode, setPgMode] = useState(initial?.pagination?.mode || "none"); // none | page | cursor
  const [pageStart, setPageStart] = useState(initial?.pagination?.start ?? 1);
  const [pageParam, setPageParam] = useState(initial?.pagination?.param || "page");
  const [limitParam, setLimitParam] = useState(initial?.pagination?.limitParam || "limit");
  const [limit, setLimit] = useState(initial?.pagination?.limit ?? 100);

  const [cursorParam, setCursorParam] = useState(initial?.pagination?.cursorParam || "cursor");
  const [cursorPath, setCursorPath] = useState(initial?.pagination?.cursorPath || "$.nextCursor");
  const [nextPath, setNextPath] = useState(initial?.pagination?.nextPath || ""); // for link-style

  // add near other preview/test state
const [previewLimit, setPreviewLimit] = useState(5);     // user-chosen preview size
const [lastResponse, setLastResponse] = useState(null);  // raw response (could be large)
const [rawOpen, setRawOpen] = useState(false);           // only stringify when opened

  // ----- Response mapping -----
  const [itemsPath, setItemsPath] = useState(initial?.resultPath || "$");
  const [columnMappings, setColumnMappings] = useState(
    (initial?.columnMappings || []).map((c) => ({
      header: typeof c.header === "string" ? c.header : (c.header?.header || c.header?.name || c.header?.key || c.key || c.field || ""),
      path: c.path || "",
      type: c.type || "text",
    }))
  );
const [filters, setFilters] = useState(initial?.filters || []);

  // ----- Test / preview -----
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
  const [sampleItems, setSampleItems] = useState([]);

  const canSave = stepName.trim() && url.trim() && columnMappings.length > 0 && columnMappings.every(m => m.header && m.path);

  const [testVia, setTestVia] = useState("browser"); // 'browser' | 'agent'
  const [testResult, setTestResult] = useState(null); // { status, ok, itemsPreview: [], total?: number }

  async function testViaBrowser() {
    const u = new URL(url);
    // append query params from UI
    (query || []).forEach(({ key, value }) => {
      if (key) u.searchParams.set(key, value ?? "");
    });
    const hdrs = {};
    // // Only include simple headers to avoid CORS preflight:
    // //   Allowed simple headers: Accept, Accept-Language, Content-Language,
    // //   Content-Type with values: application/x-www-form-urlencoded, multipart/form-data, text/plain
    // const isSimpleContentType = (v="") =>
    //   /^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)$/i.test(v.trim());
    // (headers || []).forEach(({ key, value }) => {
    //   if (!key) return;
    //   const k = key.toLowerCase();
    //   const v = (value ?? "").trim();
    //   if (k === "authorization") return;           // skip secrets in browser
    //   if (k === "content-type" && !isSimpleContentType(v)) return; // avoid preflight
    //   // You can also skip Accept to be extra safe:
    //   // if (k === "accept") return;
    //   hdrs[key] = v;
    // });

    const init = {
      method: method || "GET",
      headers: hdrs,
       mode: "cors",
       credentials: "omit",     // do not send cookies/auth automatically
       cache: "no-store",       // avoid cached oddities
    };

    if (method && method.toUpperCase() !== "GET" && body) {
      // body may be JSON or text
      try {
        init.body = JSON.stringify(JSON.parse(body));
        hdrs["Content-Type"] = "application/json";
      } catch {
        init.body = body;
      }
    }
    const res = await fetch(u.toString(), init); // may throw CORS error
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = { __text__: await res.text() };
    }
    return { status, ok: res.ok, data };
  }

  useEffect(() => {
    setFilters(initial?.filters || []);
  }, [initial]);

    async function testViaAgentProxy() {
    // normalize resultPath: "" means root
    const normalizedResultPath = (itemsPath || "")
        .trim()
        .replace(/^\$\./, "")
        .replace(/^\$/, "");

    const req = {
        method,
        url,
        headers: Object.fromEntries((headers || []).filter(h => h.key).map(h => [h.key, h.value ?? ""])),
        query: Object.fromEntries((query || []).filter(q => q.key).map(q => [q.key, q.value ?? ""])),
    };
    if (method && method.toUpperCase() !== "GET" && body?.trim()) {
        try { req.body = JSON.parse(body); } catch { req.body = body; }
    }

    const payload = {
        step: {
        id: initial?.id || `apiExtract_${Date.now()}`,
        type: "apiExtract",
        name: stepName || "API Extract",
        request: req,
        pagination: requestPayload.pagination,
        // send normalized path ("" => root)
        resultPath: normalizedResultPath,
        columnMappings,
        },
        preview: Math.max(1, Math.min(1000, Number(previewLimit) || 5)),
        full: false,
    };

    const res = await fetch(`${config.agentServerUrl}/api/test-api-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    let json = {};
    try { json = await res.json(); } catch {}
    return { status: res.status, ...json };
    }

    async function onTestRequest() {
    setTestError("");
    setTestResult(null);

    const limitN = Math.max(1, Math.min(1000, Number(previewLimit) || 5));
    const cleanItemsPath = (itemsPath || "").trim().replace(/^\$\./, "").replace(/^\$/, "");

    try {
        if (testVia === "browser") {
        try {
            const result = await testViaBrowser(); // { status, ok, data }
            const rawData = result?.data ?? {};
            setLastResponse(rawData);

            const derived = cleanItemsPath
            ? pickItems(rawData, cleanItemsPath.startsWith("/") ? `/${cleanItemsPath}` : cleanItemsPath)
            : rawData;

            const arr = Array.isArray(derived) ? derived : [];
            setSampleItems(arr.slice(0, limitN));
            setTestResult({
            status: result.status,
            ok: !!result.ok,
            total: arr.length,
            itemsPreview: arr.slice(0, Math.min(5, limitN)),
            errorText: result.ok ? "" : JSON.stringify(rawData)?.slice(0, 500),
            });
            return;
        } catch { /* fall through to agent */ }
        }

        const result = await testViaAgentProxy(); // { ok, preview, total, raw?, status }
        if ((result.status ?? 200) >= 400 || result.ok === false) {
        setLastResponse(result?.raw?.json ?? result?.raw ?? result);
        setTestError(result?.error?.message || `Request failed (${result.status ?? "unknown"})`);
        return;
        }

        const rawOut = result?.raw?.json ?? result?.raw ?? null;
        if (rawOut) setLastResponse(rawOut);

        // Prefer agent preview; if empty but raw is an array, fall back to raw
        let arr = Array.isArray(result.preview) ? result.preview : [];
        if ((!arr || arr.length === 0) && Array.isArray(rawOut)) {
        arr = rawOut;
        }
        setSampleItems((arr || []).slice(0, limitN));
        setTestResult({
        status: result.status ?? 200,
        ok: true,
        total: Number(result.total) || (arr ? arr.length : 0),
        itemsPreview: (arr || []).slice(0, Math.min(5, limitN)),
        });
    } catch (e) {
        setTestError(String(e?.message || e));
    }
    }

  // Compose request payload for agent
  const requestPayload = useMemo(() => {
    const req = {
      method,
      url,
      headers: kvRowsToObject(headers),
      query: kvRowsToObject(query),
    };
    if (method !== "GET" && body?.trim()) {
      try {
        req.body = JSON.parse(body);
      } catch {
        // leave out invalid body
      }
    }
    const pagination =
      pgMode === "page"
        ? { mode: "page", start: Number(pageStart) || 1, param: pageParam || "page", limitParam: limitParam || "limit", limit: Number(limit) || 100 }
        : pgMode === "cursor"
        ? { mode: "cursor", cursorParam: cursorParam || "cursor", cursorPath: cursorPath || "$.nextCursor", nextPath: nextPath || "" }
        : { mode: "none" };
    return { request: req, pagination, resultPath: itemsPath };
  }, [
    method, url, headers, query, body,
    pgMode, pageStart, pageParam, limitParam, limit,
    cursorParam, cursorPath, nextPath,
    itemsPath
  ]);

  async function handleTest() {
    setTesting(true);
    setTestError("");
    setSampleItems([]);
    try {
      // Prefer going through the agent (resolves {{secret:*}}, handles CORS)
      let res = await fetch(`${config.agentServerUrl}/api/http-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      if (!res.ok) throw new Error(`Agent http-test ${res.status}`);
      const data = await res.json();
      const items = pluckArray(data, itemsPath);
      setSampleItems(items.slice(0, Number(previewLimit) || 5));
      setLastResponse(data);
    } catch (e) {
      setTestError(e.message || String(e));
    } finally {
      setTesting(false);
    }
  }

  function inferFromSample() {
    if (!sampleItems?.length) return;
    const first = sampleItems[0];
    if (typeof first !== "object" || Array.isArray(first)) return;
    const entries = Object.entries(first);
    const inferred = entries.map(([key, val]) => ({
      header: key,
      path: key, // shallow path
      type:
        typeof val === "number"
          ? "number"
          : typeof val === "boolean"
          ? "boolean"
          : /(\d{4}-\d{2}-\d{2}|T\d{2}:\d{2}:\d{2})/.test(String(val))
          ? "date"
          : "text",
    }));
    setColumnMappings(inferred);
  }

  function addMapping() {
    setColumnMappings((m) => [...m, { header: "", path: "", type: "text" }]);
  }
  function updateMapping(idx, patch) {
    setColumnMappings((m) => m.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }
  function removeMapping(idx) {
    setColumnMappings((m) => m.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const payload = {
      id: initial?.id || `apiExtract_${Date.now()}`,
      type: "apiExtract",
      name: stepName,
      connectionId: initial?.connectionId || undefined, // reserved for future connection picker
      request: requestPayload.request,
      pagination: requestPayload.pagination,
      resultPath: itemsPath,
      columnMappings: columnMappings.map((c) => ({
        header: c.header,       // string header is important for StepList rendering
        path: c.path,
        type: c.type || "text",
      })),
      filters: filters && filters.length ? filters : [],
    };
    onCreate?.(payload);
  }

  return (
    <div className="space-y-5">
      <div className="text-blue-700 text-sm font-semibold">
        Step 2: Configure API Extract
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Step Name</label>
          <input
            className="w-full border px-2 py-1 rounded"
            placeholder="e.g., Fetch Providers"
            value={stepName}
            onChange={(e) => setStepName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <select
            className="w-full border px-2 py-1 rounded"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>PATCH</option>
            <option>DELETE</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL</label>
        <input
          className="w-full border px-2 py-1 rounded font-mono"
          placeholder="https://api.example.com/v1/resources"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      {/* Query + Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Query Parameters</div>
            <button className="text-xs text-indigo-600 underline" onClick={() => addRow(setQuery)} type="button">
              + Add
            </button>
          </div>
          {(query || []).map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <input
                className="border px-2 py-1 rounded"
                placeholder="key"
                value={row.key}
                onChange={(e) => updateRow(setQuery, idx, { key: e.target.value })}
              />
              <input
                className="border px-2 py-1 rounded"
                placeholder="value (supports {{row.*}} {{secret:*}})"
                value={row.value}
                onChange={(e) => updateRow(setQuery, idx, { value: e.target.value })}
              />
              <button className="text-red-600" onClick={() => removeRow(setQuery, idx)} type="button">
                &times;
              </button>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Headers</div>
            <button className="text-xs text-indigo-600 underline" onClick={() => addRow(setHeaders)} type="button">
              + Add
            </button>
          </div>
          {(headers || []).map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
              <input
                className="border px-2 py-1 rounded"
                placeholder="Header"
                value={row.key}
                onChange={(e) => updateRow(setHeaders, idx, { key: e.target.value })}
              />
              <input
                className="border px-2 py-1 rounded"
                placeholder="Value (e.g., Bearer {{secret:api_token}})"
                value={row.value}
                onChange={(e) => updateRow(setHeaders, idx, { value: e.target.value })}
              />
              <button className="text-red-600" onClick={() => removeRow(setHeaders, idx)} type="button">
                &times;
              </button>
            </div>
          ))}
        </section>
      </div>

      {/* Body (non-GET) */}
      {method !== "GET" && (
        <div>
          <label className="block text-sm font-medium mb-1">Body (JSON)</label>
          <textarea
            className="w-full border px-2 py-1 rounded font-mono"
            rows={6}
            placeholder='{"key":"value"}'
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      )}

      {/* Pagination */}
      <details className="rounded border px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">Pagination</summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={pgMode}
              onChange={(e) => setPgMode(e.target.value)}
            >
              <option value="none">None</option>
              <option value="page">Page/Limit</option>
              <option value="cursor">Cursor/Next</option>
            </select>
          </div>

          {pgMode === "page" && (
            <>
              <div>
                <label className="block text-sm mb-1">Start Page</label>
                <input className="w-full border px-2 py-1 rounded" type="number" value={pageStart} onChange={(e) => setPageStart(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Page Param</label>
                <input className="w-full border px-2 py-1 rounded" value={pageParam} onChange={(e) => setPageParam(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Limit Param</label>
                <input className="w-full border px-2 py-1 rounded" value={limitParam} onChange={(e) => setLimitParam(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Limit</label>
                <input className="w-full border px-2 py-1 rounded" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
              </div>
            </>
          )}

          {pgMode === "cursor" && (
            <>
              <div>
                <label className="block text-sm mb-1">Cursor Param</label>
                <input className="w-full border px-2 py-1 rounded" value={cursorParam} onChange={(e) => setCursorParam(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Cursor Path (JSONPath)</label>
                <input className="w-full border px-2 py-1 rounded" value={cursorPath} onChange={(e) => setCursorPath(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm mb-1">Next Link Path (optional)</label>
                <input className="w-full border px-2 py-1 rounded" value={nextPath} onChange={(e) => setNextPath(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </details>

      {/* Items path + Test */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Items Path (where the array lives)</label>
          <input
            className="w-full border px-2 py-1 rounded font-mono"
            placeholder="$.data.items"
            value={itemsPath}
            onChange={(e) => setItemsPath(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Supports simple JSONPath-like (<code>$.a.b</code>) or JSON Pointer (<code>/a/b</code>).
          </div>
        </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <span>Run test via:</span>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="testVia"
                  value="browser"
                  checked={testVia === "browser"}
                  onChange={() => setTestVia("browser")}
                />
                <span>Browser</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="testVia"
                  value="agent"
                  checked={testVia === "agent"}
                  onChange={() => setTestVia("agent")}
                />
                <span>Agent</span>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <label className="text-gray-600">Preview items</label>
                <input
                type="number"
                min={1}
                max={1000}
                className="w-20 border px-2 py-1 rounded"
                value={previewLimit}
                onChange={(e) => setPreviewLimit(e.target.value)}
                />
            </div>

            <button className="btn" onClick={onTestRequest}>Test Request</button>
          </div>

          {testError && (
            <div className="mt-2 text-sm text-red-600">{testError}</div>
          )}

          {testResult && !testResult.ok && testResult.errorText && (
          <div className="mt-2 text-xs text-red-600">Server said: {testResult.errorText}</div>
          )}          

          {lastResponse && (
          <details
              className="mt-3 border rounded bg-gray-50 text-xs"
              onToggle={(e) => setRawOpen(e.currentTarget.open)}
          >
              <summary className="cursor-pointer px-3 py-2">
              Raw response JSON (click to {rawOpen ? "hide" : "show"})
              </summary>
              <pre className="px-3 pb-3 overflow-auto">
              {rawOpen ? JSON.stringify(lastResponse, null, 2) : null}
              </pre>
          </details>
          )}

      </div>

      {/* Preview */}
      {!!testError && <div className="text-sm text-red-600">{testError}</div>}
        {sampleItems?.length > 0 && (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
                Preview (first {sampleItems.length} of your limit {previewLimit})
            </div>
            <button
                className="text-xs text-indigo-600 underline"
                onClick={inferFromSample}
                type="button"
            >
                Infer Columns
            </button>
            </div>
            <pre className="bg-gray-50 border rounded p-3 overflow-auto text-xs">
            {JSON.stringify(sampleItems, null, 2)}
            </pre>
        </div>
        )}

      {/* Column mappings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Column Mappings</div>
          <button className="text-xs text-indigo-600 underline" onClick={addMapping} type="button">
            + Add Column
          </button>
        </div>
        <div className="grid grid-cols-[1fr_1fr_150px_auto] gap-2 text-xs font-semibold text-gray-600 mb-1">
          <div>Header</div><div>JSON Path</div><div>Type</div><div></div>
        </div>
        {(columnMappings || []).map((m, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_150px_auto] gap-2 mb-2">
            <input
              className="border px-2 py-1 rounded"
              placeholder="npi"
              value={m.header}
              onChange={(e) => updateMapping(idx, { header: e.target.value })}
            />
            <input
              className="border px-2 py-1 rounded font-mono"
              placeholder="id (or $.id)"
              value={m.path}
              onChange={(e) => updateMapping(idx, { path: e.target.value })}
            />
            <select
              className="border px-2 py-1 rounded"
              value={m.type}
              onChange={(e) => updateMapping(idx, { type: e.target.value })}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button className="text-red-600" onClick={() => removeMapping(idx)} type="button">
              &times;
            </button>
          </div>
        ))}
      </div>
      {/* Result Filters (optional) */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Filters (optional)</div>
        </div>
        <FilterBuilder
          columns={columnMappings.map(c => ({
            header: c.header,
            type: c.type || "text"
          }))}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
        {/* Saved / current filters preview */}
        {/* {Array.isArray(filters) && filters.length > 0 && (
        <div className="mt-3">
            <div className="text-gray-700 font-semibold mb-1 text-sm">
            Current Filters
            </div>
            <ul className="list-disc pl-4 text-sm">
            {filters.map((f, idx) => {
                const colLabel = typeof f.column === "string"
                ? f.column
                : (f.column?.header || f.column?.name || f.column?.key || "");
                const valText = Array.isArray(f.value)
                ? f.value.join(", ")
                : String(f.value ?? "");
                return (
                <li key={idx}>
                    <span className="font-medium">{colLabel}</span>{" "}
                    {f.operator}{" "}
                    <code className="text-xs">{valText}</code>
                </li>
                );
            })}
            </ul>
        </div>
        )} */}

      {/* Footer */}
      <div className="flex justify-between">
        <button onClick={onCancel} className="text-sm text-gray-600" type="button">← Back</button>
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-1 rounded"
          type="button"
          disabled={!canSave}
        >
          {mode === "edit" ? "Save Changes" : "Save Step"}
        </button>
      </div>
    </div>
  );
}
