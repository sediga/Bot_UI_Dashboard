import { useEffect, useMemo, useRef, useState } from "react";

const StatusPanel = ({ status, logs, onClear }) => {
  const statusMap = {
    recording: { msg: "Agent is actively recording your actions.", className: "text-green-600" },
    replaying: { msg: "Agent is replaying the selected flow.", className: "text-blue-600" },
    idle:      { msg: "Agent is idle and ready.", className: "text-gray-700" },
    stopped:   { msg: "Agent is stopped.", className: "text-gray-500" },
    running:   { msg: "Agent is running.", className: "text-green-600" },
    unknown:   { msg: "Unable to connect to agent.", className: "text-red-600" }
  };

  const { msg, className } = statusMap[status] || statusMap["unknown"];

  const bottomRef = useRef(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [autoScroll, setAutoScroll] = useState(true);

  const parsedLogs = useMemo(() => {
    const list = Array.isArray(logs) ? logs : [];
    return list.map((entry, idx) => {
      const text = String(entry ?? "");
      const lc = text.toLowerCase();
      let inferredLevel = "info";
      if (lc.includes("error") || lc.includes("failed") || lc.includes("exception")) inferredLevel = "error";
      else if (lc.includes("warn")) inferredLevel = "warn";
      return { idx, text, level: inferredLevel };
    });
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return parsedLogs.filter((log) => {
      if (level !== "all" && log.level !== level) return false;
      if (!term) return true;
      return log.text.toLowerCase().includes(term);
    });
  }, [parsedLogs, query, level]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="border rounded shadow flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className={`px-3 py-2 font-semibold border-b bg-gray-100 ${className}`}>
          {msg}
        </div>

        <div className="px-3 py-2 border-b bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              className="rounded border px-2 py-1 text-xs md:col-span-2"
              placeholder="Search logs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="rounded border px-2 py-1 text-xs"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="all">All levels</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
            </select>
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto-scroll
              </label>
              {typeof onClear === "function" && (
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Showing {filteredLogs.length} of {parsedLogs.length} logs
          </div>
        </div>

        {/* Logs (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 text-gray-700 space-y-1">
          {filteredLogs.length > 0 ? (
            <>
              {filteredLogs.map((log) => (
                <div key={log.idx} className="whitespace-pre-wrap">
                  • {log.text}
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          ) : (
            <div>{parsedLogs.length ? "No logs match current filters." : "No logs to display."}</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default StatusPanel;
