import { FunctionalComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { SunIcon } from '@heroicons/react/24/outline';
import { SunIcon as SolidSunIcon } from '@heroicons/react/24/solid';

interface TimeOfDaySelectorProps {
  onTimeOfDaySelect: (timeOfDay: 'morning' | 'afternoon') => void;
  selectedDate: Date;
}

/**
 * Component for selecting morning or afternoon
 */
const TimeOfDaySelector: FunctionalComponent<TimeOfDaySelectorProps> = ({
  onTimeOfDaySelect,
  selectedDate
}) => {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(selectedDate);

  return (
    <div class="time-of-day-selector">
      <div class="time-selector-title">
        <h3>Select a time to be contacted on {formattedDate}</h3>
      </div>
      
      <div class="time-of-day-options">
        <TimeOfDayButton 
          label="Morning" 
          description="8:00 AM - 12:00 PM"
          onClick={() => onTimeOfDaySelect('morning')}
          icon={<MorningIcon />}
        />
        
        <TimeOfDayButton 
          label="Afternoon" 
          description="12:00 PM - 5:00 PM"
          onClick={() => onTimeOfDaySelect('afternoon')}
          icon={<AfternoonIcon />}
        />
      </div>
    </div>
  );
};

interface TimeOfDayButtonProps {
  label: string;
  description: string;
  onClick: () => void;
  icon: JSX.Element;
}

/**
 * Individual time of day option button
 */
const TimeOfDayButton: FunctionalComponent<TimeOfDayButtonProps> = ({
  label,
  description,
  onClick,
  icon
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  
  return (
    <button
      type="button"
      class={`time-of-day-button ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Select ${label}: ${description}`}
    >
      <div class="time-of-day-icon">
        {icon}
      </div>
      <div class="time-of-day-info">
        <div class="time-of-day-label">{label}</div>
        <div class="time-of-day-description">{description}</div>
      </div>
    </button>
  );
};

/**
 * Morning icon (sunrise) - using outline sun for morning
 */
const MorningIcon: FunctionalComponent = () => (
  <SunIcon className="w-6 h-6" />
);

/**
 * Afternoon icon (full sun) - using solid sun for afternoon to show difference
 */
const AfternoonIcon: FunctionalComponent = () => (
  <SolidSunIcon className="w-6 h-6" />
);

export default TimeOfDaySelector; 