import { FunctionComponent } from 'preact';
import { Button } from './ui/Button';
import { DocumentArrowDownIcon, DocumentTextIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../hooks/useTheme';

interface GeneratedPDF {
  filename: string;
  size: number;
  generatedAt: string;
  matterType: string;
}

interface PDFGenerationProps {
  pdf: GeneratedPDF;
  onDownload: () => void;
  onRegenerate: () => void;
}

const PDFGeneration: FunctionComponent<PDFGenerationProps> = ({
  pdf,
  onDownload,
  onRegenerate
}) => {
  const { isDark } = useTheme();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`p-4 rounded-lg shadow-md ${isDark ? 'bg-dark-card border border-dark-border' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-full ${isDark ? 'bg-green-900/20' : 'bg-green-100'}`}>
          <CheckCircleIcon className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
        </div>
        <div className="ml-3">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            PDF Generated Successfully
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Your case summary is ready for download
          </p>
        </div>
      </div>

      <div className={`p-4 rounded-md ${isDark ? 'bg-dark-bg' : 'bg-gray-50'} border border-gray-200 dark:border-dark-border mb-4`}>
        <div className="flex items-center mb-3">
          <DocumentTextIcon className={`w-5 h-5 mr-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {pdf.filename}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Matter Type:</span>
            <span className={`ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {pdf.matterType}
            </span>
          </div>
          <div>
            <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>File Size:</span>
            <span className={`ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatFileSize(pdf.size)}
            </span>
          </div>
          <div className="col-span-2">
            <div className="flex items-center">
              <ClockIcon className={`w-4 h-4 mr-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Generated:</span>
              <span className={`ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formatDate(pdf.generatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="primary"
          onClick={onDownload}
          className="flex items-center justify-center"
        >
          <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        
        <Button
          variant="secondary"
          onClick={onRegenerate}
          className="flex items-center justify-center"
        >
          <DocumentTextIcon className="w-4 h-4 mr-2" />
          Regenerate PDF
        </Button>
      </div>

      <div className={`mt-4 p-3 rounded-md ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
        <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
          What's included in your PDF:
        </h4>
        <ul className={`text-sm space-y-1 ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
          <li>• Professional case overview and matter type</li>
          <li>• Key facts and timeline of events</li>
          <li>• Parties involved in the case</li>
          <li>• Available documents and evidence</li>
          <li>• Jurisdiction and urgency information</li>
          <li>• Legal disclaimers and professional formatting</li>
        </ul>
      </div>

      <div className={`mt-4 p-3 rounded-md ${isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
        <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
          <strong>Note:</strong> This PDF is ready to share with attorneys and contains all the information needed for initial consultations. Keep a copy for your records.
        </p>
      </div>
    </div>
  );
};

export default PDFGeneration;
