import { h } from 'preact';

interface CaseQualityScoreProps {
  score: number;
  breakdown: {
    followUpCompletion: number;
    requiredFields: number;
    evidence: number;
    clarity: number;
    urgency: number;
    consistency: number;
    aiConfidence: number;
  };
  suggestions: string[];
  readyForLawyer: boolean;
  badge: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  color: 'red' | 'yellow' | 'green' | 'blue';
}

const CaseQualityScore = ({ score, breakdown, suggestions, readyForLawyer, badge, color }: CaseQualityScoreProps) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getBreakdownLabel = (key: string) => {
    const labels: Record<string, string> = {
      followUpCompletion: 'Follow-up Questions',
      requiredFields: 'Required Fields',
      evidence: 'Evidence',
      clarity: 'Clarity',
      urgency: 'Urgency',
      consistency: 'Consistency',
      aiConfidence: 'AI Confidence'
    };
    return labels[key] || key;
  };

  return (
    <div className="case-quality-score bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Case Quality Score</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getColorClasses(color)}`}>
          {badge}
        </div>
      </div>

      {/* Main Score Display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">{score}%</span>
          <span className={`text-sm font-medium ${readyForLawyer ? 'text-green-600' : 'text-yellow-600'}`}>
            {readyForLawyer ? 'Ready for Lawyer' : 'Needs More Info'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(color)}`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Breakdown</h4>
        <div className="space-y-2">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{getBreakdownLabel(key)}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${value}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{Math.round(value)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions to Improve</h4>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <span className="text-blue-500 mr-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CaseQualityScore; 