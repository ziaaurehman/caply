// Update src/components/pages/kanban/DatesModal.tsx
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { dateUtils } from "@/utils/dateUtils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface DatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDates: {
    due_date?: string | null;
  };
  onDatesChange: (dates: { due_date?: string | null }) => void;
}

export default function DatesModal({
  isOpen,
  onClose,
  currentDates,
  onDatesChange,
}: DatesModalProps) {
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state with proper date handling
  useEffect(() => {
    if (currentDates.due_date) {
      try {
        // Convert UTC to local and format for inputs
        setDueDate(dateUtils.formatForDateInput(currentDates.due_date));
        setDueTime(dateUtils.formatForTimeInput(currentDates.due_date));
      } catch (error) {
        console.error("Error parsing due date:", error);
        setDueDate("");
        setDueTime("12:00");
      }
    } else {
      setDueDate("");
      setDueTime("12:00");
    }
  }, [currentDates.due_date, isOpen]);

  const handleSave = () => {
    // setIsSubmitting(true);
    try {
      if (dueDate && dueTime) {
        // Create local datetime and convert to UTC
        const localDateTime = dateUtils.createDateTime(dueDate, dueTime);
        const utcString = dateUtils.localToUTC(localDateTime);

        onDatesChange({
          due_date: utcString,
        });
      } else {
        onDatesChange({});
      }
      onClose();
    } catch (error) {
      console.error("Error saving dates:", error);
    } finally {
      // setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    setIsSubmitting(true);
    try {
      await onDatesChange({ due_date: null });
      onClose();
    } catch (error) {
      console.error("Error removing dates:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate calendar days using date-fns
  const getCalendarDays = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const calendarDays = getCalendarDays();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Due Date</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div
                key={index}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayString = format(day, "yyyy-MM-dd");
              const dayNumber = day.getDate();
              const isCurrentMonth = day.getMonth() === new Date().getMonth();
              const isSelected = dueDate === dayString;

              return (
                <button
                  key={index}
                  onClick={() => {
                    setDueDate(dayString);
                  }}
                  className={`h-8 w-8 rounded text-sm flex items-center justify-center ${
                    !isCurrentMonth
                      ? "text-gray-300"
                      : isSelected
                        ? "bg-blue-600 text-white"
                        : "text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date and Time Inputs */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {dueDate && (
            <button
              onClick={handleRemove}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </button>
          )}
          <button
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
