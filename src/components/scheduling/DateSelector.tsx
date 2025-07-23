import { FunctionalComponent } from 'preact';
import { useState, useCallback, useMemo, useEffect } from 'preact/hooks';
import { formatDateForSelector, getDateGrid } from '../../utils/dateTime';
import { Button } from '../ui/Button';

interface DateSelectorProps {
  onDateSelect: (date: Date) => void;
  onRequestMoreDates: () => void;
  startDate?: Date;
}

/**
 * Date selector component with a 3x3 grid of dates
 */
const DateSelector: FunctionalComponent<DateSelectorProps> = ({
  onDateSelect,
  onRequestMoreDates,
  startDate = new Date()
}) => {
  // Generate the grid of dates (3x3) starting from the provided startDate
  const dateGrid = useMemo(() => getDateGrid(startDate, 9), [startDate]);
  
  // Log the date range being shown (helpful for debugging)
  useEffect(() => {
    console.log('Showing dates from', startDate, 'to', new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000));
  }, [startDate]);

  // Convert to rows for rendering (3 dates per row)
  const dateRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < dateGrid.length; i += 3) {
      rows.push(dateGrid.slice(i, i + 3));
    }
    return rows;
  }, [dateGrid]);

  return (
    <div class="date-selector">
      <div class="date-selector-title">
        <h3>Select a date</h3>
      </div>
      
      <div class="date-grid">
        {dateRows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} class="date-row">
            {row.map((date) => (
              <DateButton 
                key={date.toISOString()} 
                date={date}
                onSelect={onDateSelect}
                isToday={isToday(date)}
              />
            ))}
          </div>
        ))}
      </div>
      
      <div class="date-selector-footer">
        <Button 
          type="button"
          variant="secondary"
          onClick={onRequestMoreDates}
          aria-label="Show more date options"
          className="more-dates-button"
        >
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
            className="more-dates-icon"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          Show more dates
        </Button>
      </div>
    </div>
  );
};

interface DateButtonProps {
  date: Date;
  onSelect: (date: Date) => void;
  isToday: boolean;
}

/**
 * Individual date button component
 */
const DateButton: FunctionalComponent<DateButtonProps> = ({ 
  date, 
  onSelect,
  isToday
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = useCallback(() => {
    onSelect(date);
  }, [date, onSelect]);
  
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);
  
  // Format the date (e.g., "Mon 14")
  const formattedDate = formatDateForSelector(date);
  
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`date-button ${isToday ? 'today' : ''} ${isHovered ? 'hovered' : ''}`}
      aria-label={`Select ${formattedDate}`}
    >
      <div className="date-button-text">{formattedDate}</div>
      {isToday && <div className="today-indicator">Today</div>}
    </Button>
  );
};

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export default DateSelector; 