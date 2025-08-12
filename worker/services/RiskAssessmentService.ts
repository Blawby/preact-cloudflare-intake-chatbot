import type { Env } from '../types';

export interface RiskFactor {
  type: 'legal' | 'financial' | 'procedural' | 'jurisdictional' | 'ethical';
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  mitigation?: string;
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  confidenceScore: number; // 0.0 to 1.0
  assessmentType: 'initial' | 'updated' | 'final';
  flags: string[]; // Special attention items
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  notes?: string;
}

export class RiskAssessmentService {
  constructor(private env: Env) {}

  /**
   * Perform AI-powered risk assessment on a matter summary
   */
  async assessRisk(
    matterSummary: string, 
    matterType: string = 'General',
    clientInfo?: any
  ): Promise<RiskAssessment> {
    console.log('Performing risk assessment for matter type:', matterType);

    try {
      // First, run rule-based assessment
      const ruleBasedRisk = this.performRuleBasedAssessment(matterSummary, matterType);
      
      // Then, enhance with AI analysis
      const aiRisk = await this.performAIAssessment(matterSummary, matterType);
      
      // Combine both assessments
      const combinedAssessment = this.combineAssessments(ruleBasedRisk, aiRisk);
      
      console.log('Risk assessment completed:', {
        overallRisk: combinedAssessment.overallRiskLevel,
        factorCount: combinedAssessment.riskFactors.length,
        confidence: combinedAssessment.confidenceScore
      });

      return combinedAssessment;

    } catch (error) {
      console.error('Risk assessment failed:', error);
      
      // Return a conservative assessment on error
      return {
        overallRiskLevel: 'medium',
        riskFactors: [{
          type: 'procedural',
          level: 'medium',
          description: 'Risk assessment system unavailable',
          impact: 'Manual review required for proper risk evaluation',
          mitigation: 'Conduct thorough manual risk assessment before proceeding'
        }],
        recommendations: [
          'Conduct manual risk assessment',
          'Review with supervising attorney',
          'Document all risk factors identified'
        ],
        confidenceScore: 0.3,
        assessmentType: 'initial',
        flags: ['SYSTEM_ERROR'],
        estimatedComplexity: 'moderate',
        notes: 'Automated risk assessment failed - manual review required'
      };
    }
  }

  /**
   * Record risk assessment in database
   */
  async recordAssessment(matterId: string, assessment: RiskAssessment, assessedBy: string = 'system'): Promise<void> {
    try {
      const stmt = this.env.DB.prepare(`
        INSERT INTO risk_assessments (
          id, matter_id, assessment_type, risk_level, risk_factors, 
          recommendations, confidence_score, model_used, assessed_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      await stmt.bind(
        crypto.randomUUID(),
        matterId,
        assessment.assessmentType,
        assessment.overallRiskLevel,
        JSON.stringify(assessment.riskFactors),
        JSON.stringify(assessment.recommendations),
        assessment.confidenceScore,
        '@cf/meta/llama-3.1-8b-instruct',
        assessedBy,
        assessment.notes
      ).run();

      console.log('Risk assessment recorded for matter:', matterId);
    } catch (error) {
      console.error('Failed to record risk assessment:', error);
      // Don't throw - this is just logging
    }
  }

  private performRuleBasedAssessment(summary: string, matterType: string): Partial<RiskAssessment> {
    const riskFactors: RiskFactor[] = [];
    const flags: string[] = [];
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const lowerSummary = summary.toLowerCase();
    const lowerType = matterType.toLowerCase();

    // High-risk keywords and patterns
    const criticalKeywords = [
      'criminal', 'felony', 'arrest', 'indictment', 'prosecution',
      'class action', 'securities fraud', 'malpractice', 'wrongful death'
    ];

    const highRiskKeywords = [
      'emergency', 'urgent', 'statute of limitations', 'deadline',
      'injunction', 'restraining order', 'bankruptcy', 'foreclosure',
      'employment discrimination', 'harassment', 'retaliation'
    ];

    const mediumRiskKeywords = [
      'litigation', 'lawsuit', 'dispute', 'contract breach',
      'personal injury', 'divorce', 'custody', 'appeal'
    ];

    // Check for critical risk factors
    for (const keyword of criticalKeywords) {
      if (lowerSummary.includes(keyword)) {
        riskFactors.push({
          type: 'legal',
          level: 'critical',
          description: `Matter involves ${keyword}`,
          impact: 'Requires immediate attention and specialized expertise',
          mitigation: 'Assign senior attorney, establish priority handling'
        });
        overallRisk = 'critical';
        flags.push('HIGH_STAKES');
      }
    }

    // Check for high risk factors
    for (const keyword of highRiskKeywords) {
      if (lowerSummary.includes(keyword)) {
        riskFactors.push({
          type: 'procedural',
          level: 'high',
          description: `Time-sensitive matter involving ${keyword}`,
          impact: 'Strict deadlines and procedural requirements',
          mitigation: 'Calendar all deadlines, assign experienced attorney'
        });
        if (overallRisk !== 'critical') overallRisk = 'high';
        flags.push('TIME_SENSITIVE');
      }
    }

    // Check for medium risk factors
    for (const keyword of mediumRiskKeywords) {
      if (lowerSummary.includes(keyword)) {
        riskFactors.push({
          type: 'legal',
          level: 'medium',
          description: `Standard litigation matter involving ${keyword}`,
          impact: 'Requires careful case management and documentation',
          mitigation: 'Follow standard litigation protocols'
        });
        if (overallRisk === 'low') overallRisk = 'medium';
      }
    }

    // Matter type specific risks
    if (lowerType.includes('family')) {
      riskFactors.push({
        type: 'procedural',
        level: 'medium',
        description: 'Family law matter with emotional complexity',
        impact: 'High client emotional involvement, potential for disputes',
        mitigation: 'Clear communication, document all agreements'
      });
    }

    if (lowerType.includes('employment')) {
      riskFactors.push({
        type: 'legal',
        level: 'medium',
        description: 'Employment law with potential statutory claims',
        impact: 'Strict filing deadlines, administrative requirements',
        mitigation: 'Track all deadlines, preserve evidence carefully'
      });
    }

    // Financial complexity indicators
    if (lowerSummary.includes('million') || lowerSummary.includes('$')) {
      riskFactors.push({
        type: 'financial',
        level: 'high',
        description: 'High-value financial matter',
        impact: 'Significant financial exposure, increased scrutiny',
        mitigation: 'Detailed documentation, consider insurance coverage'
      });
      flags.push('HIGH_VALUE');
    }

    return {
      overallRiskLevel: overallRisk,
      riskFactors,
      flags,
      estimatedComplexity: this.estimateComplexity(riskFactors, lowerSummary)
    };
  }

  private async performAIAssessment(summary: string, matterType: string): Promise<Partial<RiskAssessment>> {
    const prompt = `You are a legal risk assessment AI. Analyze this legal matter and identify risks.

Matter Type: ${matterType}
Summary: ${summary}

Respond with JSON containing:
{
  "riskLevel": "low|medium|high|critical",
  "riskFactors": [
    {
      "type": "legal|financial|procedural|jurisdictional|ethical",
      "level": "low|medium|high|critical", 
      "description": "brief description",
      "impact": "potential impact"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "complexity": "simple|moderate|complex|highly_complex",
  "confidence": 0.8
}

Focus on legal risks, procedural complexities, and potential issues.`;

    try {
      const result = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a legal risk assessment expert. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.1
      });

      const response = result.response || result;
      const aiAssessment = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        overallRiskLevel: aiAssessment.riskLevel || 'medium',
        riskFactors: (aiAssessment.riskFactors || []).map((factor: any) => ({
          ...factor,
          mitigation: this.generateMitigation(factor)
        })),
        recommendations: aiAssessment.recommendations || [],
        confidenceScore: aiAssessment.confidence || 0.7,
        estimatedComplexity: aiAssessment.complexity || 'moderate'
      };

    } catch (error) {
      console.error('AI risk assessment failed:', error);
      return {
        overallRiskLevel: 'medium',
        riskFactors: [],
        recommendations: ['Manual risk assessment recommended due to AI analysis failure'],
        confidenceScore: 0.3,
        estimatedComplexity: 'moderate'
      };
    }
  }

  private combineAssessments(
    ruleBasedRisk: Partial<RiskAssessment>, 
    aiRisk: Partial<RiskAssessment>
  ): RiskAssessment {
    // Combine risk factors
    const allRiskFactors = [
      ...(ruleBasedRisk.riskFactors || []),
      ...(aiRisk.riskFactors || [])
    ];

    // Determine overall risk level (take the higher of the two)
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const ruleRiskIndex = riskLevels.indexOf(ruleBasedRisk.overallRiskLevel || 'low');
    const aiRiskIndex = riskLevels.indexOf(aiRisk.overallRiskLevel || 'low');
    const overallRiskLevel = riskLevels[Math.max(ruleRiskIndex, aiRiskIndex)] as 'low' | 'medium' | 'high' | 'critical';

    // Combine recommendations
    const allRecommendations = [
      ...(ruleBasedRisk.recommendations || []),
      ...(aiRisk.recommendations || []),
      ...this.getStandardRecommendations(overallRiskLevel)
    ];

    // Remove duplicates
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      overallRiskLevel,
      riskFactors: allRiskFactors,
      recommendations: uniqueRecommendations,
      confidenceScore: Math.max(aiRisk.confidenceScore || 0.5, 0.6), // Boost confidence with rule-based
      assessmentType: 'initial',
      flags: ruleBasedRisk.flags || [],
      estimatedComplexity: aiRisk.estimatedComplexity || ruleBasedRisk.estimatedComplexity || 'moderate',
      notes: `Combined rule-based and AI assessment. ${allRiskFactors.length} risk factors identified.`
    };
  }

  private estimateComplexity(riskFactors: RiskFactor[], summary: string): 'simple' | 'moderate' | 'complex' | 'highly_complex' {
    const criticalFactors = riskFactors.filter(f => f.level === 'critical').length;
    const highFactors = riskFactors.filter(f => f.level === 'high').length;
    const totalFactors = riskFactors.length;

    if (criticalFactors > 0 || highFactors > 2) return 'highly_complex';
    if (highFactors > 0 || totalFactors > 3) return 'complex';
    if (totalFactors > 1) return 'moderate';
    return 'simple';
  }

  private generateMitigation(factor: any): string {
    const mitigationStrategies: Record<string, Record<string, string>> = {
      legal: {
        low: 'Monitor for developments and document thoroughly',
        medium: 'Research applicable law and precedents',
        high: 'Consult with specialists and consider expert witnesses',
        critical: 'Immediate senior attorney review and specialized counsel'
      },
      financial: {
        low: 'Standard billing and cost tracking',
        medium: 'Detailed cost-benefit analysis and client communication',
        high: 'Consider fee arrangements and insurance coverage',
        critical: 'Executive review of financial exposure and risk management'
      },
      procedural: {
        low: 'Follow standard procedures and document steps',
        medium: 'Create detailed timeline and checkpoint system',
        high: 'Assign dedicated case manager and calendar all deadlines',
        critical: 'Priority handling with daily status checks'
      }
    };

    const typeStrategies = mitigationStrategies[factor.type] || mitigationStrategies.legal;
    return typeStrategies[factor.level] || 'Standard risk management protocols apply';
  }

  private getStandardRecommendations(riskLevel: string): string[] {
    const recommendations: Record<string, string[]> = {
      low: [
        'Standard case management protocols',
        'Regular client communication'
      ],
      medium: [
        'Enhanced documentation and tracking',
        'Weekly case review meetings',
        'Clear client expectations management'
      ],
      high: [
        'Senior attorney supervision',
        'Detailed risk management plan',
        'Frequent client updates and consent',
        'Consider malpractice insurance implications'
      ],
      critical: [
        'Immediate partner/principal review',
        'Specialized counsel consultation',
        'Enhanced documentation protocols',
        'Daily case monitoring',
        'Client risk disclosure and consent'
      ]
    };

    return recommendations[riskLevel] || recommendations.medium;
  }
}
