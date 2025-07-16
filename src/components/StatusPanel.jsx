import { useEffect, useState } from "react";

const StatusPanel = ({ status, logs }) => {
  const statusMap = {
    recording: { msg: "Agent is actively recording your actions.", className: "text-green-600" },
    replaying: { msg: "Agent is replaying the selected flow.", className: "text-blue-600" },
    idle:      { msg: "Agent is idle and ready.", className: "text-gray-700" },
    stopped:   { msg: "Agent is stopped.", className: "text-gray-500" },
    unknown:   { msg: "Unable to connect to agent.", className: "text-red-600" }
  };

  const { msg, className } = statusMap[status] || statusMap["unknown"];

  return (
    <div className="p-4 bg-white border rounded shadow-sm h-full overflow-auto">
      <div className={`text-sm font-medium mb-2 ${className}`}>
        {msg}
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        {logs && logs.length > 0 ? (
          logs.slice(0, 5).map((log, idx) => (
            <div key={idx} className="whitespace-pre-wrap">
              • {log}
            </div>
          ))
        ) : (
          <div>No logs to display.</div>
        )}
      </div>
    </div>
  );
};


export default StatusPanel;
