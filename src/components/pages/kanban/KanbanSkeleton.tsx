import React from "react";

export default function KanbanSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="max-w-full mx-auto p-4">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-4" />
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="flex-shrink-0 w-80 bg-white/90 rounded-xl shadow-md p-4 min-h-[350px] flex flex-col">
              <div className="h-6 w-2/3 bg-gray-200 rounded mb-4" />
              <div className="flex-grow space-y-3">
                {[1, 2].map((row) => (
                  <div key={row} className="bg-gray-200 rounded-2xl h-16" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 