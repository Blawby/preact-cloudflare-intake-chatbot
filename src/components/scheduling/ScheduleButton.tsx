import { FunctionalComponent } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { CalendarIcon as HeroCalendarIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';

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
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      aria-label="Request Consultation"
      title="Request Consultation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="schedule-button"
    >
      <CalendarIcon isHovered={isHovered} />
      <span className="schedule-button-text">Consultation</span>
    </Button>
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