import React from "react";

const patients = [
  {
    id: "p001",
    name: "Yolanda Banker",
    dob: "1982-11-05",
    status: "Active",
    nextVisit: "2025-07-20",
  },
  {
    id: "p002",
    name: "Jameson Lee",
    dob: "1975-03-22",
    status: "Inactive",
    nextVisit: "—",
  },
  {
    id: "p003",
    name: "Priya Desai",
    dob: "1990-08-14",
    status: "Active",
    nextVisit: "2025-07-18",
  },
];

const MockPatientGrid = () => {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Patient List</h2>
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">DOB</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Next Visit</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{patient.name}</td>
                <td className="px-4 py-2 text-gray-700">{patient.dob}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      patient.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {patient.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-700">{patient.nextVisit}</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="text-indigo-600 hover:underline">View</button>
                  <button className="text-gray-600 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MockPatientGrid;
