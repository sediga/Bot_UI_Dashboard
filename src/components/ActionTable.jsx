export function ActionTable({ actions }) {
  return (
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
        {actions.map((a, idx) => (
          <tr key={idx} className="even:bg-white odd:bg-gray-50">
            <td className="p-2 border-b">{new Date(a.timestamp).toLocaleTimeString()}</td>
            <td className="p-2 border-b">{a.action}</td>
            <td className="p-2 border-b font-mono text-xs text-blue-800">{a.selector}</td>
            <td className="p-2 border-b">{a.value ?? ''}</td>
            <td className="p-2 border-b text-xs text-gray-500">{a.url}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
