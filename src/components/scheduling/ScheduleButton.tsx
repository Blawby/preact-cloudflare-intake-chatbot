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
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      aria-label="Request Consultation"
      title="Request Consultation"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex items-center justify-center ml-2"
    >
      <CalendarIcon isHovered={isHovered} />
      <span className="text-sm font-medium">Consultation</span>
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
    <HeroCalendarIcon className="w-4 h-4 mr-1.5" />
  );
};

export default ScheduleButton; 