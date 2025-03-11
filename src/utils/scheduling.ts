/**
 * Scheduling utilities for detecting intent and managing scheduling flows
 */

/**
 * Detect if a message contains scheduling intent
 * @param message User message to analyze
 * @returns true if scheduling intent is detected
 */
export const detectSchedulingIntent = (message: string): boolean => {
  const schedulingKeywords = [
    'schedule',
    'appointment',
    'meeting',
    'book',
    'calendar',
    'availability',
    'available',
    'time',
    'slot',
    'when can'
  ];
  
  const lowerMessage = message.toLowerCase();
  return schedulingKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Create a scheduling response object based on the current state
 * @param stage Which stage of scheduling to respond with
 * @param params Additional parameters needed for the response
 * @returns A structured scheduling response
 */
export const createSchedulingResponse = (
  stage: 'initial' | 'date-selection' | 'time-of-day' | 'time-slot' | 'confirmation',
  params: {
    selectedDate?: Date;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
    scheduledDateTime?: Date;
  } = {}
) => {
  const { selectedDate, timeOfDay, scheduledDateTime } = params;
  
  switch (stage) {
    case 'initial':
      return {
        content: "I'd be happy to help you schedule something. What day works best for you?",
        isUser: false,
        scheduling: {
          type: 'date-selection',
          selectedDate: new Date()
        }
      };
      
    case 'date-selection':
      if (!selectedDate) throw new Error('Selected date is required for date-selection stage');
      return {
        content: `Great! What time on ${formatDate(selectedDate)} works best for you?`,
        isUser: false,
        scheduling: {
          type: 'time-of-day-selection',
          selectedDate
        }
      };
      
    case 'time-of-day':
      if (!selectedDate || !timeOfDay) 
        throw new Error('Selected date and time of day are required for time-of-day stage');
      return {
        content: `Great! Here are the available time slots for ${formatDate(selectedDate)} in the ${timeOfDay}:`,
        isUser: false,
        scheduling: {
          type: 'time-slot-selection',
          selectedDate,
          timeOfDay
        }
      };
      
    case 'confirmation':
      if (!scheduledDateTime) 
        throw new Error('Scheduled date time is required for confirmation stage');
      return {
        content: `Perfect! I've scheduled our appointment for ${formatDateTime(scheduledDateTime)}. Is there anything specific you'd like to discuss during our meeting?`,
        isUser: false,
        scheduling: {
          type: 'confirmation',
          scheduledDateTime
        }
      };
      
    default:
      return {
        content: "I'd be happy to help you schedule something. What day works best for you?",
        isUser: false,
        scheduling: {
          type: 'date-selection',
          selectedDate: new Date()
        }
      };
  }
};

/**
 * Format a date for display
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * Format a date and time for display
 */
const formatDateTime = (date: Date): string => {
  const dateStr = formatDate(date);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
  
  return `${timeStr} on ${dateStr}`;
}; 