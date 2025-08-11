"use client"

import { useState } from "react"
import { X, Calendar, Clock } from "lucide-react"

interface DatesModalProps {
  isOpen: boolean
  onClose: () => void
  currentDates: {
    due_date?: string
  }
  onDatesChange: (dates: { due_date?: string }) => void
}

export default function DatesModal({
  isOpen,
  onClose,
  currentDates,
  onDatesChange
}: DatesModalProps) {
  const [dueDate, setDueDate] = useState(currentDates.due_date || '')
  const [dueTime, setDueTime] = useState('12:00')

  const handleSave = () => {
    const dueDateTime = dueDate ? `${dueDate}T${dueTime}` : undefined
    onDatesChange({
      due_date: dueDateTime
    })
    onClose()
  }

  const handleRemove = () => {
    onDatesChange({})
    onClose()
  }

  if (!isOpen) return null

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
            <div className="grid grid-cols-7 gap-1 text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`day-${index}`} className="text-center text-gray-500 font-medium py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const day = i + 1
                const isCurrentMonth = day <= 31
                const isSelected = dueDate && new Date(dueDate).getDate() === day
                return (
                  <div
                    key={i}
                    className={`text-center py-1 rounded cursor-pointer ${
                      isCurrentMonth
                        ? isSelected
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-900 hover:bg-gray-200'
                        : 'text-gray-300'
                    }`}
                  >
                    {isCurrentMonth ? day : ''}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={!!dueDate}
                onChange={(e) => setDueDate(e.target.checked ? new Date().toISOString().split('T')[0] : '')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">Due date</label>
            </div>
            {dueDate && (
              <div className="space-y-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
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
  )
}
