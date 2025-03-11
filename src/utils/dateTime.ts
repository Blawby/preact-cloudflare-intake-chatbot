/**
 * Date and time utilities for scheduling functionality
 */

/**
 * Get formatted date for display in the date selector
 * @param date Date object
 * @returns Formatted date string like "Mon 14"
 */
export const formatDateForSelector = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric'
  }).format(date);
};

/**
 * Get full formatted date for messages
 * @param date Date object
 * @returns Formatted date string like "Monday, May 14th"
 */
export const formatFullDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

/**
 * Format time with timezone information
 * @param date Date object
 * @returns Formatted time string with timezone
 */
export const formatTimeWithTimezone = (date: Date): string => {
  const timeString = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
  
  const timezoneString = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short'
  }).format(date);
  
  return `${timeString} ${timezoneString}`;
};

/**
 * Get array of dates for the date selector grid
 * @param startDate Starting date (defaults to today)
 * @param days Number of days to include
 * @returns Array of Date objects
 */
export const getDateGrid = (startDate: Date = new Date(), days: number = 9): Date[] => {
  const dates: Date[] = [];
  
  // Clone the startDate to avoid modifying the original
  const baseDate = new Date(startDate);
  
  for (let i = 0; i < days; i++) {
    // Create a new date for each day to avoid reference issues
    const newDate = new Date(baseDate);
    newDate.setDate(baseDate.getDate() + i);
    dates.push(newDate);
  }
  
  return dates;
};

/**
 * Get time slots for a specific part of day
 * @param date Base date
 * @param partOfDay 'morning' | 'afternoon' | 'evening'
 * @returns Array of Date objects representing time slots
 */
export const getTimeSlots = (
  date: Date, 
  partOfDay: 'morning' | 'afternoon' | 'evening'
): Date[] => {
  const slots: Date[] = [];
  const slotDate = new Date(date);
  
  // Set hours based on part of day
  let startHour = 8;  // Default morning start
  let endHour = 12;   // Default morning end
  
  if (partOfDay === 'afternoon') {
    startHour = 12;
    endHour = 17;
  } else if (partOfDay === 'evening') {
    startHour = 17;
    endHour = 21;
  }
  
  // Create slots in 30-minute increments
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute of [0, 30]) {
      slotDate.setHours(hour, minute, 0, 0);
      slots.push(new Date(slotDate));
    }
  }
  
  return slots;
};

/**
 * Format time slot for display
 * @param date Date object
 * @returns Formatted time string like "8:30 AM"
 */
export const formatTimeSlot = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

/**
 * Get user's timezone
 * @returns Timezone string
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Get readable timezone name
 * @returns Formatted timezone string
 */
export const getReadableTimezone = (): string => {
  const date = new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short'
  }).format(date).split(' ').pop() || '';
}; 