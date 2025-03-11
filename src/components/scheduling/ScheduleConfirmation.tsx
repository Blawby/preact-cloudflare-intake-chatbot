import { FunctionalComponent } from 'preact';
import { formatFullDate, formatTimeWithTimezone } from '../../utils/dateTime';

interface ScheduleConfirmationProps {
  scheduledDateTime: Date;
}

/**
 * Component for displaying a confirmed scheduled date and time
 */
const ScheduleConfirmation: FunctionalComponent<ScheduleConfirmationProps> = ({
  scheduledDateTime
}) => {
  const formattedDate = formatFullDate(scheduledDateTime);
  const formattedTime = formatTimeWithTimezone(scheduledDateTime);
  
  return (
    <div class="schedule-confirmation">
      <div class="schedule-confirmation-icon">
        <CalendarIcon />
      </div>
      
      <div class="schedule-confirmation-details">
        <div class="schedule-confirmation-title">
          Scheduled
        </div>
        
        <div class="schedule-confirmation-date">
          {formattedDate}
        </div>
        
        <div class="schedule-confirmation-time">
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

/**
 * Calendar check icon for confirmation
 */
const CalendarIcon: FunctionalComponent = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="confirmation-calendar-icon"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="M9 16l2 2 4-4"></path>
  </svg>
);

export default ScheduleConfirmation; 