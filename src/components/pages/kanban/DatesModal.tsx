"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock } from "lucide-react";

interface DatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDates: {
    due_date?: string;
  };
  onDatesChange: (dates: { due_date?: string }) => void;
}

export default function DatesModal({
  isOpen,
  onClose,
  currentDates,
  onDatesChange,
}: DatesModalProps) {
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("12:00");

  // Initialize state when modal opens or currentDates changes
  useEffect(() => {
    if (currentDates.due_date) {
      // Extract date part from datetime string
      const datePart = currentDates.due_date.split("T")[0];
      setDueDate(datePart);

      // Extract time part from datetime string
      const timePart = currentDates.due_date.split("T")[1];
      if (timePart) {
        // Convert from "12:00:00" or "12:00:00Z" to "12:00"
        const timeOnly = timePart.split(":").slice(0, 2).join(":");
        setDueTime(timeOnly);
      }
    } else {
      setDueDate("");
      setDueTime("12:00");
    }
  }, [currentDates.due_date, isOpen]);

  const handleSave = () => {
    const dueDateTime = dueDate ? `${dueDate}T${dueTime}` : undefined;
    onDatesChange({
      due_date: dueDateTime,
    });
    onClose();
  };

  const handleRemove = () => {
    onDatesChange({});
    onClose();
  };

  // Helper function to get current month's calendar data
  const getCalendarData = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = firstDay.getDay(); // 0 = Sunday

    const daysInMonth = lastDay.getDate();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDate; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return { days, year, month };
  };

  const handleDateClick = (day: number) => {
    const { year, month } = getCalendarData();

    // Create date string manually to avoid timezone issues
    const monthStr = String(month + 1).padStart(2, "0"); // month is 0-indexed
    const dayStr = String(day).padStart(2, "0");
    const dateString = `${year}-${monthStr}-${dayStr}`;

    console.log("Selected day:", day, "Generated date string:", dateString);
    setDueDate(dateString);
  };

  const { days } = getCalendarData();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Dates</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          {/* Calendar Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center text-sm font-medium text-gray-700 mb-3">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div
                  key={`day-${index}`}
                  className="text-center text-gray-500 font-medium py-1"
                >
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="py-1"></div>;
                }

                const isSelected =
                  dueDate && new Date(dueDate).getDate() === day;
                const isToday = new Date().getDate() === day;

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`text-center py-1 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : isToday
                          ? "bg-blue-100 text-blue-700 font-semibold"
                          : "text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={!!dueDate}
                onChange={(e) =>
                  setDueDate(
                    e.target.checked
                      ? new Date().toISOString().split("T")[0]
                      : ""
                  )
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Due date
              </label>
            </div>
            {dueDate && (
              <div className="space-y-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={handleRemove}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
