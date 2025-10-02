import { FunctionComponent } from 'preact';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordion';
import {
  MessageCircle,
  FileText,
  User,
  CreditCard,
  CheckCircle,
  UserPlus,
  Clock,
  Image,
  Video,
  Music,
  File,
  Link
} from 'lucide-preact';
import { useActivity } from '../hooks/useActivity';

interface ActivityTimelineProps {
  className?: string;
  teamId?: string;
  matterId?: string;
  sessionId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Event type to icon mapping
const EVENT_ICONS: Record<string, any> = {
  // Matter Events
  matter_created: Clock,
  matter_status_changed: MessageCircle,
  lawyer_assigned: UserPlus,
  payment_completed: CreditCard,
  payment_failed: CreditCard,

  // Media Events
  image_added: Image,
  video_added: Video,
  audio_added: Music,
  document_added: FileText,
  file_added: File,
  link_shared: Link,

  // Session Events
  session_started: Clock,
  contact_info_provided: User,
  intake_completed: CheckCircle,
  review_requested: MessageCircle,

  // Default fallback
  default: Clock
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

const ActivityTimeline: FunctionComponent<ActivityTimelineProps> = ({ 
  className = '',
  teamId,
  matterId,
  sessionId,
  limit = 25,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  // Use the activity hook to fetch real data
  const { events, loading, error, hasMore, loadMore, refresh } = useActivity({
    teamId,
    matterId,
    sessionId,
    limit,
    autoRefresh,
    refreshInterval
  });

  return (
    <div className={className}>
      <Accordion type="single" collapsible>
        <AccordionItem value="activity-timeline-section">
          <AccordionTrigger>
            Activity Timeline
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3 pt-2">
              {/* Error state */}
              {error && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
                  </div>
                  <button
                    onClick={refresh}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Events list */}
              {events.map((event, index) => {
                const IconComponent = EVENT_ICONS[event.eventType] || EVENT_ICONS.default;
                return (
                  <div key={event.id} className="relative flex items-start gap-3">
                    {/* Timeline line */}
                    {index < events.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    )}
                    
                    {/* Icon */}
                    <div className="relative flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <IconComponent className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </h5>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(event.eventDate)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.description}
                      </p>
                      {event.actorType && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          by {event.actorType}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {!error && events.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs mt-1">Activity will appear here as you use the system</p>
                </div>
              )}

              {/* Load more button */}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  Load more events
                </button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ActivityTimeline;
