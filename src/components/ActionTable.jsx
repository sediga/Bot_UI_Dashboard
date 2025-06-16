export function ActionTable({ actions }) {
  return (
    <div className="overflow-x-auto">
      {actions.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <strong>Last Action:</strong> {actions[actions.length - 1].action} — {actions[actions.length - 1].selector}
        </div>
      )}

      <table className="min-w-full text-sm border border-gray-300">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 border-b">Time</th>
            <th className="p-2 border-b">Action</th>
            <th className="p-2 border-b">Selector</th>
            <th className="p-2 border-b">Value</th>
            <th className="p-2 border-b">URL</th>
          </tr>
        </thead>
        <tbody>
          {actions.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center p-4 text-gray-500">
                No actions received yet.
              </td>
            </tr>
          ) : (
            actions.map((a, idx) => (
              <tr key={idx} className="even:bg-white odd:bg-gray-50">
                <td className="p-2 border-b">{new Date(a.timestamp).toLocaleTimeString()}</td>
                <td className="p-2 border-b">{a.action ?? 'N/A'}</td>
                <td className="p-2 border-b font-mono text-xs text-blue-800">{a.selector ?? 'N/A'}</td>
                <td className="p-2 border-b">{a.value ?? 'N/A'}</td>
                <td className="p-2 border-b text-xs text-gray-500">{a.url ?? 'N/A'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
