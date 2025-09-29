import { FunctionComponent } from 'preact';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/Accordion';
import { 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UserIcon,
  CreditCardIcon,
  CheckCircleIcon,
  UserPlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ActivityTimelineProps {
  className?: string;
}

const ActivityTimeline: FunctionComponent<ActivityTimelineProps> = ({ className = '' }) => {
  // Realistic legal matter timeline data
  const timelineItems = [
    {
      id: 1,
      type: 'matter_started',
      title: 'Matter Started',
      description: 'July 16',
      icon: ClockIcon
    },
    {
      id: 2,
      type: 'contact_provided',
      title: 'Contact Info Provided',
      description: 'Sarah Johnson provided contact details',
      icon: UserIcon
    },
    {
      id: 3,
      type: 'document_added',
      title: 'Document Added',
      description: 'Sarah Johnson added employment_contract.pdf',
      icon: DocumentTextIcon
    },
    {
      id: 4,
      type: 'payment_requested',
      title: 'Payment Requested',
      description: 'Retainer payment of $2,500 requested',
      icon: CreditCardIcon
    },
    {
      id: 5,
      type: 'payment_completed',
      title: 'Payment Completed',
      description: 'Retainer payment received and processed',
      icon: CheckCircleIcon
    },
    {
      id: 6,
      type: 'lawyer_assigned',
      title: 'Lawyer Assigned',
      description: 'Attorney Michael Chen assigned to case',
      icon: UserPlusIcon
    },
    {
      id: 7,
      type: 'status_updated',
      title: 'Status Updated',
      description: 'Matter moved to In Progress',
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
                  <div key={item.id} className="relative flex items-start gap-3">
                    {/* Timeline line */}
                    {index < timelineItems.length - 1 && (
                      <div className="absolute left-6 top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
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
