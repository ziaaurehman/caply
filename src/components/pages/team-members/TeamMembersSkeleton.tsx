import React from "react";

export default function TeamMembersSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse p-4">
      <div className="max-w-6xl mx-auto">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-6" />
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="h-6 w-1/4 bg-gray-200 rounded mb-4" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {["Name", "Email", "Role", "Department", "Status", "Actions"].map((header, idx) => (
                    <th key={idx} className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((row) => (
                  <tr key={row}>
                    {[1, 2, 3, 4, 5, 6].map((col) => (
                      <td key={col} className="px-6 py-4">
                        <div className="h-6 w-full bg-gray-100 rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 