import { FunctionalComponent } from 'preact';
import { useState, useCallback, useMemo } from 'preact/hooks';
import { 
  formatTimeSlot, 
  getTimeSlots, 
  getReadableTimezone 
} from '../../utils/dateTime';

interface TimeSlotSelectorProps {
  onTimeSlotSelect: (timeSlot: Date) => void;
  selectedDate: Date;
  timeOfDay: 'morning' | 'afternoon';
}

/**
 * Component for selecting specific 30-minute time slots
 */
const TimeSlotSelector: FunctionalComponent<TimeSlotSelectorProps> = ({
  onTimeSlotSelect,
  selectedDate,
  timeOfDay
}) => {
  // Generate time slots based on selected date and time of day
  const timeSlots = useMemo(() => 
    getTimeSlots(selectedDate, timeOfDay), 
    [selectedDate, timeOfDay]
  );
  
  // Format the date for display
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(selectedDate);
  
  // Get time of day label
  const timeOfDayLabel = useMemo(() => {
    switch (timeOfDay) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      default: return '';
    }
  }, [timeOfDay]);
  
  // Get user's timezone for display
  const timezone = getReadableTimezone();
  
  return (
    <div class="time-slot-selector">
      <div class="time-slot-title">
        <h3>Select a consultation time</h3>
        <div class="time-slot-subtitle">
          {formattedDate}, {timeOfDayLabel} ({timezone})
        </div>
      </div>
      
      <div class="time-slots-grid">
        {timeSlots.map((slot) => (
          <TimeSlotButton
            key={slot.toISOString()}
            timeSlot={slot}
            onSelect={onTimeSlotSelect}
          />
        ))}
      </div>
    </div>
  );
};

interface TimeSlotButtonProps {
  timeSlot: Date;
  onSelect: (timeSlot: Date) => void;
}

/**
 * Individual time slot button component
 */
const TimeSlotButton: FunctionalComponent<TimeSlotButtonProps> = ({
  timeSlot,
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(() => {
    onSelect(timeSlot);
  }, [timeSlot, onSelect]);
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  
  // Format the time slot (e.g., "8:30 AM")
  const formattedTime = formatTimeSlot(timeSlot);
  
  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      class={`time-slot-button ${isHovered ? 'hovered' : ''}`}
      aria-label={`Select ${formattedTime}`}
    >
      {formattedTime}
    </button>
  );
};

export default TimeSlotSelector; 