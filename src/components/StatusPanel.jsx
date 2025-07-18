import { useEffect, useRef } from "react";

const StatusPanel = ({ status, logs }) => {
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

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="border rounded shadow flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className={`px-3 py-2 font-semibold border-b bg-gray-100 ${className}`}>
          {msg}
        </div>

        {/* Logs (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 text-gray-700 space-y-1">
          {logs && logs.length > 0 ? (
            <>
              {logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">• {log}</div>
              ))}
              <div ref={bottomRef} />
            </>
          ) : (
            <div>No logs to display.</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default StatusPanel;
