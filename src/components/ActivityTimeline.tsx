import { FunctionComponent } from 'preact';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordian';
import { 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface ActivityTimelineProps {
  className?: string;
}

const ActivityTimeline: FunctionComponent<ActivityTimelineProps> = ({ className = '' }) => {
  // Placeholder timeline data
  const timelineItems = [
    {
      id: 1,
      type: 'contract',
      title: 'Contract started',
      description: 'July 16',
      icon: DocumentTextIcon
    },
    {
      id: 2,
      type: 'contract',
      title: 'Contract ended',
      description: 'Paul ended the contract on July 18',
      icon: DocumentTextIcon
    },
    {
      id: 3,
      type: 'feedback',
      title: 'No feedback given',
      description: 'Ok',
      icon: ChatBubbleLeftRightIcon
    }
  ];

  return (
    <div className={className}>
      <Accordion type="single" collapsible>
        <AccordionItem value="activity-timeline-section">
          <AccordionTrigger>Activity Timeline</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3 pt-2">
              {timelineItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    {/* Timeline line */}
                    {index < timelineItems.length - 1 && (
                      <div className="absolute left-6 top-8 w-px h-8 bg-gray-200 dark:bg-gray-700" />
                    )}
                    
                    {/* Icon */}
                    <div className="relative flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <IconComponent className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </h5>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ActivityTimeline;
