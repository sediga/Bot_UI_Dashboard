import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import config from "../config";
import { authHeaders, listFlows } from "../utils/flowApi";

function toIsoIfValid(value) {
  if (!value) return undefined;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

function normalizeRunsResponse(data) {
  if (Array.isArray(data)) return { items: data, total: data.length };
  if (data && Array.isArray(data.items)) return { items: data.items, total: Number(data.total ?? data.items.length) };
  if (data && Array.isArray(data.runs)) return { items: data.runs, total: Number(data.total ?? data.runs.length) };
  return { items: [], total: 0 };
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function normalizeLogsResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.logs)) return data.logs;
  return [];
}

function mapRun(run) {
  const startedAt = run.startedAt || run.createdAt || run.startTime || null;
  const endedAt = run.endedAt || run.completedAt || run.endTime || null;
  const durationMs = run.durationMs ?? (startedAt && endedAt ? new Date(endedAt) - new Date(startedAt) : null);
  return {
    raw: run,
    runId: run.runId || run.id || run.run_id || "",
    startedAt,
    endedAt,
    durationMs,
    status: String(run.status || "unknown").toLowerCase(),
    triggerType: run.triggerType || run.trigger || "-",
    flowPath: run.flowPath || run.flowId || run.flow || "",
    flowName: run.flowName || run.flowLabel || "",
    agentVersion: run.agentVersion || run.agent || "-",
    summary: run.summary || run.message || "",
  };
}

function mapLog(log) {
  return {
    logId: log.logId || log.id || log.log_id || `${log.logAt || ""}-${log.message || ""}`,
    logAt: log.logAt || log.createdAt || log.timestamp || null,
    level: String(log.level || "info").toLowerCase(),
    message: log.message || log.msg || log.text || "",
    metaJson: typeof log.metaJson === "string" ? log.metaJson : log.meta ? JSON.stringify(log.meta) : "",
  };
}

export default function RunsPanel({ cfg = config }) {
  const API_BASE = cfg?.apiBaseUrl || "";

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(25);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openRun, setOpenRun] = useState(null);

  const [flows, setFlows] = useState([]);
  const [flowQuery, setFlowQuery] = useState("");
  const [statusQuery, setStatusQuery] = useState("");
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [filters, setFilters] = useState({
    flowId: "",
    status: "",
    from: "",
    to: "",
    search: "",
  });

  const [autoRefresh, setAutoRefresh] = useState(true);

  const buildHeaders = useCallback(() => authHeaders({ "x-api-key": String(cfg?.apiKey || "") }), [cfg?.apiKey]);

  const fetchRuns = useCallback(async () => {
    const token = localStorage.getItem("botflows_token");
    if (!token) {
      setErr("Not signed in");
      setRows([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();
      if (filters.flowId) {
        if (isGuid(filters.flowId)) qs.set("flowId", filters.flowId);
        else qs.set("flowPath", filters.flowId);
      }
      if (filters.status) qs.set("status", filters.status);
      if (filters.from) qs.set("from", toIsoIfValid(filters.from) || filters.from);
      if (filters.to) qs.set("to", toIsoIfValid(filters.to) || filters.to);
      if (filters.search) qs.set("q", filters.search);
      qs.set("skip", String(skip));
      qs.set("take", String(take));

      const res = await fetch(`${API_BASE}/api/runs?${qs.toString()}`, { headers: buildHeaders() });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const normalized = normalizeRunsResponse(data);
      const mapped = normalized.items.map(mapRun);
      setRows(mapped);
      setTotal(normalized.total);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [API_BASE, buildHeaders, filters, skip, take]);

  const fetchFlows = useCallback(async () => {
    try {
      const data = await listFlows();
      setFlows(Array.isArray(data) ? data : []);
    } catch {
      setFlows([]);
    }
  }, []);

  const applyFilters = useCallback(() => {
    setFilters({
      flowId: flowQuery,
      status: statusQuery,
      from: fromQuery,
      to: toQuery,
      search: searchQuery.trim(),
    });
    setSkip(0);
  }, [flowQuery, statusQuery, fromQuery, toQuery, searchQuery]);

  const clearFilters = useCallback(() => {
    setFlowQuery("");
    setStatusQuery("");
    setFromQuery("");
    setToQuery("");
    setSearchQuery("");
    setFilters({ flowId: "", status: "", from: "", to: "", search: "" });
    setSkip(0);
  }, []);

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const next = {
        flowId: qs.get("flowId") || "",
        status: qs.get("status") || "",
        from: qs.get("from") || "",
        to: qs.get("to") || "",
        search: qs.get("q") || "",
      };
      setFlowQuery(next.flowId);
      setStatusQuery(next.status);
      setFromQuery(next.from);
      setToQuery(next.to);
      setSearchQuery(next.search);
      setFilters(next);
    } catch {}
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchRuns, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchRuns]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "botflows_token") fetchRuns();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchRuns]);

  const flowMap = useMemo(() => {
    const map = {};
    flows.forEach((f) => {
      if (f.path) map[f.path] = f.name;
      if (f.id) map[f.id] = f.name;
    });
    return map;
  }, [flows]);

  const msToHuman = (ms) => {
    if (ms == null || ms < 0) return "-";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ss = s % 60;
    if (h) return `${h}h ${mm}m ${ss}s`;
    if (m) return `${mm}m ${ss}s`;
    return `${ss}s`;
  };

  const chip = (status) => {
    const base = "inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium";
    const map = {
      running: "bg-blue-100 text-blue-700 border-blue-200",
      succeeded: "bg-emerald-100 text-emerald-700 border-emerald-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return `${base} ${map[status] || "bg-slate-100 text-slate-700 border-slate-200"}`;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Run History</h2>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto refresh (15s)
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white border rounded-xl p-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Flow</label>
          <select value={flowQuery} onChange={(e) => setFlowQuery(e.target.value)} className="border rounded px-3 py-2 min-w-[240px]">
            <option value="">All flows</option>
            {flows.map((flow) => (
              <option key={flow.id || flow.path} value={flow.id || flow.path}>{flow.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Status</label>
          <select value={statusQuery} onChange={(e) => setStatusQuery(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-600">From</label>
          <input type="datetime-local" value={fromQuery} onChange={(e) => setFromQuery(e.target.value)} className="border rounded px-3 py-2" />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-600">To</label>
          <input type="datetime-local" value={toQuery} onChange={(e) => setToQuery(e.target.value)} className="border rounded px-3 py-2" />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Search</label>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="summary / trigger / run id"
            className="border rounded px-3 py-2 w-[240px]"
          />
        </div>

        <button onClick={applyFilters} className="px-4 py-2 rounded border bg-white hover:bg-slate-50">Apply</button>
        <button onClick={clearFilters} className="px-4 py-2 rounded border bg-white hover:bg-slate-50">Reset</button>
        <button
          type="button"
          onClick={fetchRuns}
          aria-label="Refresh"
          title="Refresh"
          disabled={loading}
          className="px-3 py-2 rounded border bg-white hover:bg-slate-50 disabled:opacity-50 inline-flex items-center"
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 12 12 12" />
          </svg>
        </button>
      </div>

      <div className="overflow-x-auto bg-white border rounded-2xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Started</th>
              <th className="text-left px-4 py-3">Flow</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Trigger</th>
              <th className="text-left px-4 py-3">Run ID</th>
              <th className="text-left px-4 py-3">Summary</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.runId || `${r.startedAt}-${r.summary}`} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{r.startedAt ? new Date(r.startedAt).toLocaleString() : "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.flowName || flowMap[r.flowPath] || r.flowPath || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{msToHuman(r.durationMs)}</td>
                <td className="px-4 py-3"><span className={chip(r.status)}>{r.status}</span></td>
                <td className="px-4 py-3 whitespace-nowrap">{r.triggerType}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{r.runId || "-"}</td>
                <td className="px-4 py-3">{r.summary || ""}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50 disabled:opacity-40"
                    onClick={() => setOpenRun(r.runId)}
                    disabled={!r.runId}
                  >
                    View logs
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No runs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded border bg-white disabled:opacity-40" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - take))}>Prev</button>
          <span className="text-sm">Page {Math.floor(skip / take) + 1}</span>
          <button className="px-3 py-1.5 rounded border bg-white disabled:opacity-40" disabled={skip + take >= total} onClick={() => setSkip(skip + take)}>Next</button>
          <select className="border rounded px-2 py-1.5" value={take} onChange={(e) => { setTake(Number(e.target.value)); setSkip(0); }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
      </div>

      {openRun && (
        <LogsDrawer
          runId={openRun}
          onClose={() => setOpenRun(null)}
          apiBase={API_BASE}
          buildHeaders={buildHeaders}
        />
      )}

      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}

function LogsDrawer({ runId, onClose, apiBase, buildHeaders }) {
  const [logs, setLogs] = useState([]);
  const [after, setAfter] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const sentinelRef = useRef(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (level && l.level !== level) return false;
      if (query && !`${l.message} ${l.metaJson}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [logs, level, query]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (after !== undefined) qs.set("afterLogId", String(after));
      qs.set("take", "500");

      const res = await fetch(`${apiBase}/api/runs/${runId}/logs?${qs.toString()}`, { headers: buildHeaders() });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const page = normalizeLogsResponse(data).map(mapLog);
      setLogs((prev) => prev.concat(page));
      if (page.length > 0) setAfter(page[page.length - 1].logId);
      if (page.length === 0) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [after, apiBase, buildHeaders, hasMore, loading, runId]);

  useEffect(() => {
    setLogs([]);
    setAfter(undefined);
    setHasMore(true);
  }, [runId]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const root = document.querySelector("#log-scroll-area");
    const el = sentinelRef.current;
    if (!root || !el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadMore();
        });
      },
      { root, threshold: 0.1 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[780px] bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Run Logs</div>
          <button className="px-3 py-1.5 rounded border bg-white" onClick={onClose}>Close</button>
        </div>

        <div className="p-3 border-b flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-600">Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="border rounded px-2 py-1.5">
            <option value="">All</option>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search log text"
            className="border rounded px-3 py-1.5 min-w-[240px]"
          />
          <div className="text-xs text-slate-500">Showing {filtered.length} logs</div>
        </div>

        <div id="log-scroll-area" className="flex-1 overflow-auto">
          {filtered.map((item) => (
            <div key={item.logId} className="px-4 py-2 border-b text-sm grid grid-cols-12 gap-2">
              <div className="col-span-3 text-slate-600">{item.logAt ? new Date(item.logAt).toLocaleString() : "-"}</div>
              <div className="col-span-1">
                <span className="inline-block px-2 py-0.5 rounded border text-xs">{item.level}</span>
              </div>
              <div className="col-span-8">
                <div className="font-medium whitespace-pre-wrap">{item.message}</div>
                {item.metaJson && item.metaJson.length > 2 && (
                  <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-auto max-h-40 border">{safePretty(item.metaJson)}</pre>
                )}
              </div>
            </div>
          ))}

          {hasMore && <div ref={sentinelRef} className="p-4 text-center text-slate-400">Loading more...</div>}
          {!hasMore && filtered.length === 0 && <div className="p-6 text-center text-slate-500">No logs</div>}
        </div>
      </div>
    </div>
  );
}

function safePretty(metaJson) {
  if (!metaJson || metaJson.length <= 2) return null;
  try {
    return JSON.stringify(JSON.parse(metaJson), null, 2);
  } catch {
    return metaJson;
  }
}
