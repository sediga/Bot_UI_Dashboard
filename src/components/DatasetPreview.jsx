import React, { useState } from "react";

export default function DatasetPreview({ data }) {
  const [showModal, setShowModal] = useState(false);

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0] || {});
  const sample = data.slice(0, 10);

  return (
    <div className="mt-2 border rounded bg-gray-50 p-3 text-xs">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-gray-700">
          Dataset Preview ({data.length} rows, {columns.length} columns)
        </span>
        <button
          className="text-blue-600 hover:underline"
          onClick={() => setShowModal(true)}
        >
          View full dataset
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto mt-2 max-h-48 border bg-white">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-100 border-b">
              {columns.map((col) => (
                <th key={col} className="px-2 py-1 text-left font-medium text-gray-600 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sample.map((row, idx) => (
              <tr key={idx} className="border-b">
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1 whitespace-nowrap">
                    {row[col] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6">
          <div className="bg-white rounded shadow-lg w-full max-w-5xl p-4 overflow-auto max-h-[85vh]">
            <div className="flex justify-between mb-3">
              <h2 className="text-sm font-semibold">Full Dataset ({data.length} rows)</h2>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="overflow-auto border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    {columns.map((col) => (
                      <th key={col} className="px-2 py-1 text-left font-medium text-gray-600 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-1 whitespace-nowrap">
                          {row[col] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
