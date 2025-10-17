import React, { useEffect, useMemo, useRef, useState } from "react";
// either import your existing config or pass it in as a prop
import config from "../config"; // <-- adjust path OR remove and pass {config} as prop

export default function RunsPanel({ cfg = config }) {
  const API_BASE = cfg?.apiBaseUrl || "";

  const buildHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("botflows_token") || ""}`,
    "Content-Type": "application/json",
    "x-api-key": String(cfg?.apiKey || "")
  });

  async function listRuns(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) qs.set(k, String(v));
    });
    const res = await fetch(`${API_BASE}/api/runs?${qs.toString()}`, {
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // { total, items }
  }

  async function getRunLogs(runId, { afterLogId, take = 500 } = {}) {
    const qs = new URLSearchParams();
    if (afterLogId !== undefined) qs.set("afterLogId", String(afterLogId));
    qs.set("take", String(take));
    const res = await fetch(`${API_BASE}/api/runs/${runId}/logs?${qs.toString()}`, {
      headers: buildHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // FlowRunLog[]
  }

  // -------- utils
  const msToHuman = (ms) => {
    if (!ms || ms < 0) return "-";
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    const mm = m % 60, ss = s % 60;
    if (h) return `${h}h ${mm}m ${ss}s`;
    if (m) return `${mm}m ${ss}s`;
    return `${ss}s`;
  };
  const fmt = (dt) => (dt ? new Date(dt).toLocaleString() : "-");
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

  // -------- state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(25);
  const [status, setStatus] = useState("");
  const [flowId, setFlowId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openRun, setOpenRun] = useState(null);

  // optional: apply prefilters from /runs?flowId=...&status=...
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      qs.get("flowId") && setFlowId(qs.get("flowId"));
      qs.get("status") && setStatus(qs.get("status"));
      qs.get("from") && setFrom(qs.get("from"));
      qs.get("to") && setTo(qs.get("to"));
    } catch {}
  }, []);

  async function fetchPage() {
    // bail early if not authenticated yet
    const token = localStorage.getItem("botflows_token");
    if (!token) { setErr("Not signed in"); return; }

    setLoading(true); setErr(null);
    try {
      const data = await listRuns({
        flowId: flowId || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        skip, take
      });
      setRows(data.items); setTotal(data.total);
    } catch (e) {
      setErr(e.message || String(e));
    } finally { setLoading(false); }
  }
  
  useEffect(() => {
    const id = setInterval(fetchPage, 15_000); // every 15s
    return () => clearInterval(id);
  }, [skip, take, status, flowId, from, to]);

  // refresh when paging or when token changes (e.g., after login)
  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, take]);

  // also refetch when the token in localStorage changes (another tab logged in/out)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "botflows_token") fetchPage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Run History</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded px-3 py-2">
            <option value="">All</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Flow Id</label>
          <input value={flowId} onChange={e=>setFlowId(e.target.value)} placeholder="optional"
                 className="border rounded px-3 py-2 w-[280px]" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">From</label>
          <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-3 py-2"/>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">To</label>
          <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2"/>
        </div>
        <button onClick={()=>{ setSkip(0); fetchPage(); }} className="px-4 py-2 rounded border bg-white hover:bg-slate-50">
          Apply
        </button>
        <button
          type="button"
          onClick={fetchPage}
          aria-label="Refresh"
          title="Refresh"
          disabled={loading}
          className="px-3 py-2 rounded border bg-white hover:bg-slate-50 disabled:opacity-50 inline-flex items-center"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* circular arrow refresh icon */}
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 12 12 12" />
          </svg>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border rounded-2xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3">Started</th>
              <th className="text-left px-4 py-3">Duration</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Trigger</th>
              <th className="text-left px-4 py-3">Agent</th>
              <th className="text-left px-4 py-3">Summary</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.runId} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">{fmt(r.startedAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{msToHuman(r.durationMs)}</td>
                <td className="px-4 py-3"><span className={chip(r.status)}>{r.status}</span></td>
                <td className="px-4 py-3 whitespace-nowrap">{r.triggerType}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.agentVersion || "-"}</td>
                <td className="px-4 py-3">{r.summary || ""}</td>
                <td className="px-4 py-3 text-right">
                  <button className="px-3 py-1.5 rounded border bg-white hover:bg-slate-50"
                          onClick={()=>setOpenRun(r.runId)}>View logs</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No runs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded border bg-white disabled:opacity-40"
                  disabled={skip===0} onClick={()=>setSkip(Math.max(0, skip - take))}>Prev</button>
          <span className="text-sm">Page {Math.floor(skip/take)+1}</span>
          <button className="px-3 py-1.5 rounded border bg-white disabled:opacity-40"
                  disabled={skip + take >= total} onClick={()=>setSkip(skip + take)}>Next</button>
          <select className="border rounded px-2 py-1.5" value={take}
                  onChange={e=>{ setTake(Number(e.target.value)); setSkip(0); }}>
            {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
      </div>

      {openRun && (
        <LogsDrawer
          runId={openRun}
          onClose={()=>setOpenRun(null)}
          getRunLogs={getRunLogs}
        />
      )}
      {loading && <div className="text-sm text-slate-500">Loading…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}

function LogsDrawer({ runId, onClose, getRunLogs }) {
  const [logs, setLogs] = useState([]);
  const [after, setAfter] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [level, setLevel] = useState("");
  const ref = useRef(null);

  const filtered = useMemo(() => level ? logs.filter(l => l.level === level) : logs, [logs, level]);

  async function loadMore() {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const page = await getRunLogs(runId, { afterLogId: after, take: 500 });
      setLogs(prev => prev.concat(page));
      if (page.length > 0) setAfter(page[page.length - 1].logId);
      if (page.length === 0) setHasMore(false);
    } finally { setLoading(false); }
  }

  useEffect(() => { setLogs([]); setAfter(undefined); setHasMore(true); loadMore(); /* eslint-disable-next-line */ }, [runId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) loadMore(); });
    }, { root: document.querySelector("#log-scroll-area"), threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref.current, hasMore, loading]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="absolute right-0 top-0 h-full w-full sm:w-[720px] bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Run Logs</div>
          <button className="px-3 py-1.5 rounded border bg-white" onClick={onClose}>Close</button>
        </div>
        <div className="p-3 border-b flex items-center gap-3">
          <label className="text-xs text-slate-600">Level</label>
          <select value={level} onChange={e=>setLevel(e.target.value)} className="border rounded px-2 py-1.5">
            <option value="">All</option><option value="debug">debug</option>
            <option value="info">info</option><option value="warn">warn</option>
            <option value="error">error</option>
          </select>
          <div className="text-xs text-slate-500">Showing {filtered.length} logs</div>
        </div>
        <div id="log-scroll-area" className="flex-1 overflow-auto">
          {filtered.map(item => (
            <div key={item.logId} className="px-4 py-2 border-b text-sm grid grid-cols-12 gap-2">
              <div className="col-span-3 text-slate-600">{item.logAt ? new Date(item.logAt).toLocaleString() : "-"}</div>
              <div className="col-span-1">
                <span className="inline-block px-2 py-0.5 rounded border text-xs">{item.level}</span>
              </div>
              <div className="col-span-8">
                <div className="font-medium">{item.message}</div>
                {item.metaJson && item.metaJson.length>2 && (
                  <pre className="mt-1 text-xs bg-slate-50 rounded p-2 overflow-auto max-h-40 border">
                    {safePretty(item.metaJson)}
                  </pre>
                )}
              </div>
            </div>
          ))}
          {hasMore && <div ref={ref} className="p-4 text-center text-slate-400">Loading more…</div>}
          {!hasMore && filtered.length === 0 && <div className="p-6 text-center text-slate-500">No logs</div>}
        </div>
      </div>
    </div>
  );
}

function safePretty(metaJson) {
    if (metaJson.length <= 2) return null;
  try { return JSON.stringify(JSON.parse(metaJson), null, 2); }
  catch { return metaJson; }
}
