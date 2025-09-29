import { FunctionComponent } from 'preact';
import { Button } from './ui/Button';
import { analyzeMissingInfo } from '../utils/matterAnalysis';
import { 
  DocumentIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CreditCardIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleOvalLeftIcon
} from '@heroicons/react/24/outline';
import { MatterData, MatterStatus, getDefaultDocumentSuggestions } from '../hooks/useMatterState';

interface MatterTabProps {
  matter: MatterData | null;
  status: MatterStatus;
  onStartChat?: () => void;
  onViewInChat?: () => void;
  onPayNow?: () => void;
  onViewPDF?: () => void;
  onShareMatter?: () => void;
}

const MatterTab: FunctionComponent<MatterTabProps> = ({
  matter,
  status,
  onStartChat,
  onViewInChat,
  onPayNow,
  onViewPDF,
  onShareMatter
}) => {
  // Empty state - no matter exists yet
  if (status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <DocumentIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Matter Yet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Start a chat to create your matter
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={<ChatBubbleOvalLeftIcon className="w-4 h-4" />}
          onClick={onStartChat}
        >
          Start Chat
        </Button>
      </div>
    );
  }

  if (!matter) {
    return null;
  }

  // Get document suggestions (use existing or default)
  const documentSuggestions = matter.documentChecklist?.documents || 
    getDefaultDocumentSuggestions(matter.service);

  // Analyze missing information
  const missingInfo = analyzeMissingInfo(matter);

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Matter Header */}
      <div className="bg-white dark:bg-dark-card-bg rounded-lg p-4 border border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {matter.matterNumber || 'Matter'}
          </h3>
          <div className={`w-3 h-3 rounded-full ${
            status === 'ready' ? 'bg-green-500' :
            status === 'incomplete' ? 'bg-orange-500' :
            'bg-gray-400'
          }`} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {matter.service}
        </p>
        {matter.matterSummary && (
          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-3">
            {matter.matterSummary.substring(0, 100)}...
          </p>
        )}
      </div>

      {/* Missing Information Section */}
      {missingInfo.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-2" />
            <h4 className="font-medium text-orange-900 dark:text-orange-100">
              Missing Information
            </h4>
          </div>
          <ul className="space-y-1">
            {missingInfo.slice(0, 3).map((info, index) => (
              <li key={index} className="text-sm text-orange-800 dark:text-orange-200">
                • {info}
              </li>
            ))}
            {missingInfo.length > 3 && (
              <li className="text-sm text-orange-600 dark:text-orange-300">
                • +{missingInfo.length - 3} more items
              </li>
            )}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={onViewInChat}
          >
            Continue in Chat
          </Button>
        </div>
      )}

      {/* Document Suggestions */}
      <div className="bg-white dark:bg-dark-card-bg rounded-lg p-4 border border-gray-200 dark:border-dark-border">
        <div className="flex items-center mb-3">
          <DocumentIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            Suggested Documents
          </h4>
        </div>
        <div className="space-y-2">
          {documentSuggestions.slice(0, 3).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center">
                {doc.status === 'uploaded' ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <DocumentIcon className="w-4 h-4 text-gray-400 mr-2" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {doc.name}
                  </p>
                  {doc.required && (
                    <span className="text-xs text-red-500">Required</span>
                  )}
                </div>
              </div>
              {doc.status === 'missing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Upload
                </Button>
              )}
            </div>
          ))}
          {documentSuggestions.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +{documentSuggestions.length - 3} more documents
            </p>
          )}
        </div>
      </div>

      {/* Payment Section */}
      {matter.hasPayment && matter.paymentEmbed && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <CreditCardIcon className="w-5 h-5 text-blue-500 mr-2" />
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Payment Required
            </h4>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            {matter.paymentEmbed.description || 'Consultation fee'}
            {matter.paymentEmbed.amount && (
              <span className="font-semibold"> - ${matter.paymentEmbed.amount}</span>
            )}
          </p>
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={onPayNow}
            >
              Pay Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              icon={<ArrowTopRightOnSquareIcon className="w-4 h-4" />}
              onClick={onViewInChat}
            >
              View in Chat
            </Button>
          </div>
        </div>
      )}

      {/* Ready State Actions */}
      {status === 'ready' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
            <h4 className="font-medium text-green-900 dark:text-green-100">
              Matter Complete
            </h4>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200 mb-3">
            All required information has been provided
          </p>
          <div className="space-y-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={onViewPDF}
            >
              View PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={onShareMatter}
            >
              Share Matter
            </Button>
          </div>
        </div>
      )}

      {/* View in Chat Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-dark-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-600 dark:text-gray-400"
          icon={<ChatBubbleOvalLeftIcon className="w-4 h-4" />}
          onClick={onViewInChat}
        >
          View in Chat
        </Button>
      </div>
    </div>
  );
};


export default MatterTab;
