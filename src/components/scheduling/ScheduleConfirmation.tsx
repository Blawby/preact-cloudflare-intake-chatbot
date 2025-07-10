import { FunctionalComponent } from 'preact';
import { CalendarIcon as HeroCalendarIcon } from '@heroicons/react/24/outline';
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
 * Calendar check icon for confirmation using Heroicons
 */
const CalendarIcon: FunctionalComponent = () => (
  <HeroCalendarIcon className="confirmation-calendar-icon w-6 h-6" />
);

export default ScheduleConfirmation; 