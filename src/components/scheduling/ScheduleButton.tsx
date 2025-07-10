import { FunctionalComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { CalendarIcon as HeroCalendarIcon } from '@heroicons/react/24/outline';

interface ScheduleButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Schedule button component with calendar icon
 * Appears next to the plus button in the chat input
 */
const ScheduleButton: FunctionalComponent<ScheduleButtonProps> = ({ 
  onClick, 
  disabled = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      class="schedule-button"
      aria-label="Request Consultation"
      title="Request Consultation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CalendarIcon isHovered={isHovered} />
      <span class="schedule-button-text">Consultation</span>
    </button>
  );
};

interface IconProps {
  isHovered: boolean;
}

/**
 * Calendar icon component using Heroicons
 */
const CalendarIcon: FunctionalComponent<IconProps> = ({ isHovered }) => {
  return (
    <HeroCalendarIcon className="calendar-icon w-4 h-4" />
  );
};

export default ScheduleButton; 