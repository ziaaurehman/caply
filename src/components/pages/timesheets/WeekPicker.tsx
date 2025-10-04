"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface WeekPickerProps {
  value: string; // ISO date string (Monday of the week)
  onChange: (weekStart: string) => void;
  className?: string;
}

export default function WeekPicker({
  value,
  onChange,
  className = "",
}: WeekPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date(value));
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateAsISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get Monday of the week for any given date - FIXED VERSION
  const getMondayOfWeek = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date); // Create a new date object to avoid mutation
    monday.setDate(diff);
    return monday;
  };

  // Get Friday of the week for any given date - FIXED VERSION
  const getFridayOfWeek = (date: Date): Date => {
    const monday = getMondayOfWeek(new Date(date));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // Friday is 4 days after Monday
    return friday;
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday

    const days = [];
    const currentDate = new Date(startDate);

    // Generate 6 weeks (42 days) to cover the month
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const handleDateClick = (date: Date) => {
    const monday = getMondayOfWeek(new Date(date));
    const mondayString = formatDateAsISO(monday);

    setSelectedDate(monday);
    onChange(mondayString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const formatWeekRange = (weekStart: string) => {
    const monday = new Date(weekStart);
    const friday = getFridayOfWeek(new Date(monday));

    return `${monday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${friday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Week:</span>
        <span className="text-sm text-gray-900">{formatWeekRange(value)}</span>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => navigateMonth("prev")}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-semibold text-gray-900">
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>

            <button
              type="button"
              onClick={() => navigateMonth("next")}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-gray-500 text-center py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              const isWeekday = day.getDay() >= 1 && day.getDay() <= 5; // Monday to Friday
              const isSelected =
                day.toDateString() === selectedDate.toDateString();

              // Check if this day is part of the selected week
              const mondayOfThisWeek = getMondayOfWeek(new Date(day));
              const mondayOfSelectedWeek = getMondayOfWeek(
                new Date(selectedDate)
              );
              const isInSelectedWeek =
                mondayOfThisWeek.toDateString() ===
                mondayOfSelectedWeek.toDateString();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={!isWeekday}
                  className={`
                    text-xs py-2 px-1 rounded transition-colors
                    ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                    ${!isWeekday ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100 cursor-pointer"}
                    ${isToday ? "bg-blue-100 text-blue-700 font-semibold" : ""}
                    ${isSelected ? "bg-primary-500 text-white font-semibold" : ""}
                    ${isInSelectedWeek && !isSelected ? "bg-primary-50 text-primary-700" : ""}
                  `}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600 text-center">
              Click any weekday to select that week (Monday - Friday)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
