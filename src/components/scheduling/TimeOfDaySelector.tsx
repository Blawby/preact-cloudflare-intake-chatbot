import { FunctionalComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';

interface TimeOfDaySelectorProps {
  onTimeOfDaySelect: (timeOfDay: 'morning' | 'afternoon' | 'evening') => void;
  selectedDate: Date;
}

/**
 * Component for selecting morning, afternoon, or evening
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
        <h3>Select a time on {formattedDate}</h3>
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
        
        <TimeOfDayButton 
          label="Evening" 
          description="5:00 PM - 9:00 PM"
          onClick={() => onTimeOfDaySelect('evening')}
          icon={<EveningIcon />}
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
 * Morning icon (sunrise)
 */
const MorningIcon: FunctionalComponent = () => (
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
  >
    <path d="M12 2v8" />
    <path d="m4.93 10.93 1.41 1.41" />
    <path d="M2 18h2" />
    <path d="M20 18h2" />
    <path d="m19.07 10.93-1.41 1.41" />
    <path d="M22 22H2" />
    <path d="m8 6 4-4 4 4" />
    <path d="M16 18a4 4 0 0 0-8 0" />
  </svg>
);

/**
 * Afternoon icon (sun)
 */
const AfternoonIcon: FunctionalComponent = () => (
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
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

/**
 * Evening icon (sunset)
 */
const EveningIcon: FunctionalComponent = () => (
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
  >
    <path d="M12 10V2" />
    <path d="m4.93 10.93 1.41 1.41" />
    <path d="M2 18h2" />
    <path d="M20 18h2" />
    <path d="m19.07 10.93-1.41 1.41" />
    <path d="M22 22H2" />
    <path d="m16 6-4 4-4-4" />
    <path d="M16 18a4 4 0 0 0-8 0" />
  </svg>
);

export default TimeOfDaySelector; 