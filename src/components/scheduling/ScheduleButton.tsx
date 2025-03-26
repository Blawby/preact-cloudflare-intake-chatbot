import { FunctionalComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';

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
 * Calendar icon SVG component
 */
const CalendarIcon: FunctionalComponent<IconProps> = ({ isHovered }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      class="calendar-icon"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
};

export default ScheduleButton; 