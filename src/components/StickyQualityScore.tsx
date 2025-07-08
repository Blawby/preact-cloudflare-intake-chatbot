import { h } from 'preact';

interface StickyQualityScoreProps {
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
  isVisible: boolean;
}

const StickyQualityScore = ({ score, breakdown, suggestions, readyForLawyer, badge, color, isVisible }: StickyQualityScoreProps) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red': return 'sticky-score-badge-red';
      case 'yellow': return 'sticky-score-badge-yellow';
      case 'green': return 'sticky-score-badge-green';
      case 'blue': return 'sticky-score-badge-blue';
      default: return 'sticky-score-badge-gray';
    }
  };

  const getProgressColor = (color: string) => {
    switch (color) {
      case 'red': return 'sticky-score-progress-red';
      case 'yellow': return 'sticky-score-progress-yellow';
      case 'green': return 'sticky-score-progress-green';
      case 'blue': return 'sticky-score-progress-blue';
      default: return 'sticky-score-progress-gray';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="sticky-quality-score">
      <div className="sticky-quality-score-container">
        <div className="sticky-quality-score-content">
          {/* Score and Badge */}
          <div className="sticky-quality-score-left">
            <div className="sticky-quality-score-main">
              <span className="sticky-quality-score-value">{score}%</span>
              <div className={`sticky-quality-score-badge ${getColorClasses(color)}`}>
                {badge}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="sticky-quality-score-progress">
              <div className="sticky-quality-score-progress-bg">
                <div 
                  className={`sticky-quality-score-progress-fill ${getProgressColor(color)}`}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="sticky-quality-score-right">
            <span className={`sticky-quality-score-status ${readyForLawyer ? 'ready' : 'needs-info'}`}>
              {readyForLawyer ? 'Ready for Lawyer' : 'Needs More Info'}
            </span>
            
            {/* Collapsible Details */}
            <details className="sticky-quality-score-details">
              <summary className="sticky-quality-score-details-trigger">
                Details
              </summary>
              <div className="sticky-quality-score-details-content">
                {/* Breakdown */}
                <div className="sticky-quality-score-breakdown">
                  <h4 className="sticky-quality-score-breakdown-title">Breakdown</h4>
                  <div className="sticky-quality-score-breakdown-items">
                    {Object.entries(breakdown).map(([key, value]) => (
                      <div key={key} className="sticky-quality-score-breakdown-item">
                        <span className="sticky-quality-score-breakdown-label">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <div className="sticky-quality-score-breakdown-progress">
                          <div className="sticky-quality-score-breakdown-bg">
                            <div 
                              className="sticky-quality-score-breakdown-fill"
                              style={{ width: `${value}%` }}
                            ></div>
                          </div>
                          <span className="sticky-quality-score-breakdown-value">{Math.round(value)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="sticky-quality-score-suggestions">
                    <h4 className="sticky-quality-score-suggestions-title">Suggestions</h4>
                    <ul className="sticky-quality-score-suggestions-list">
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <li key={index} className="sticky-quality-score-suggestion-item">
                          <span className="sticky-quality-score-suggestion-bullet">•</span>
                          {suggestion}
                        </li>
                      ))}
                      {suggestions.length > 3 && (
                        <li className="sticky-quality-score-suggestion-more">
                          +{suggestions.length - 3} more suggestions
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyQualityScore; 