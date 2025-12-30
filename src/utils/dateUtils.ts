// Update src/utils/dateUtils.ts with proper date-fns implementation
import {
  format,
  parseISO,
  formatISO,
  isValid,
  isDate,
  startOfWeek,
} from "date-fns";

export const dateUtils = {
  // Get start of current week (Monday)
  getCurrentWeekStart: (): string => {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  },

  // Convert UTC string to local Date object
  utcToLocal: (utcString: string | Date): Date | null => {
    if (!utcString) return null;

    try {
      const date =
        typeof utcString === "string" ? parseISO(utcString) : utcString;
      return isValid(date) ? date : null;
    } catch (error) {
      console.error("Error parsing UTC date:", error);
      return null;
    }
  },

  // Convert local Date to UTC string
  localToUTC: (localDate: Date | string): string => {
    try {
      const date =
        typeof localDate === "string" ? parseISO(localDate) : localDate;
      return isValid(date) ? formatISO(date) : formatISO(new Date());
    } catch (error) {
      console.error("Error converting to UTC:", error);
      return formatISO(new Date());
    }
  },

  // Format date for display (local timezone)
  formatForDisplay: (
    date: string | Date,
    pattern: string = "MMM dd, yyyy HH:mm"
  ): string => {
    try {
      const localDate = dateUtils.utcToLocal(date);
      if (!localDate) return "";
      return format(localDate, pattern);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  },

  // Format date for input fields (YYYY-MM-DD)
  formatForDateInput: (date: string | Date): string => {
    try {
      const localDate = dateUtils.utcToLocal(date);
      if (!localDate) return "";
      return format(localDate, "yyyy-MM-dd");
    } catch (error) {
      console.error("Error formatting date for input:", error);
      return "";
    }
  },

  // Format time for input fields (HH:mm)
  formatForTimeInput: (date: string | Date): string => {
    try {
      const localDate = dateUtils.utcToLocal(date);
      if (!localDate) return "12:00";
      return format(localDate, "HH:mm");
    } catch (error) {
      console.error("Error formatting time for input:", error);
      return "12:00";
    }
  },

  // Create a date from date and time strings
  createDateTime: (dateString: string, timeString: string): Date => {
    try {
      if (!dateString || !timeString) return new Date();

      // Parse date and time separately
      const [year, month, day] = dateString.split("-").map(Number);
      const [hours, minutes] = timeString.split(":").map(Number);

      // Create date in local timezone
      const date = new Date(year, month - 1, day, hours, minutes);

      return isValid(date) ? date : new Date();
    } catch (error) {
      console.error("Error creating datetime:", error);
      return new Date();
    }
  },

  // Get current date in YYYY-MM-DD format
  getCurrentDateString: (): string => {
    return format(new Date(), "yyyy-MM-dd");
  },

  // Get current time in HH:mm format
  getCurrentTimeString: (): string => {
    return format(new Date(), "HH:mm");
  },

  // Check if date is valid
  isValidDate: (date: any): boolean => {
    return isValid(date);
  },
};
