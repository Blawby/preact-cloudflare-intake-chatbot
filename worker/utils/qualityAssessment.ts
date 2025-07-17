// Simplified matter quality assessment (no AI calls)
export interface QualityAssessment {
  score: number;
  readyForLawyer: boolean;
  breakdown: {
    answerQuality: number;
    answerCompleteness: number;
    answerRelevance: number;
    answerLength: number;
    serviceSpecificity: number;
    urgencyIndication: number;
    evidenceMentioned: number;
    timelineProvided: number;
  };
  issues: string[];
  suggestions: string[];
  confidence: 'high' | 'medium' | 'low';
}

export function assessMatterQuality(matterData: any): QualityAssessment {
  const answers = matterData.answers || {};
  const answerEntries = Object.entries(answers);
  
  // Initialize assessment
  const assessment: QualityAssessment = {
    score: 0,
    readyForLawyer: false,
    breakdown: {
      answerQuality: 0,
      answerCompleteness: 0,
      answerRelevance: 0,
      answerLength: 0,
      serviceSpecificity: 0,
      urgencyIndication: 0,
      evidenceMentioned: 0,
      timelineProvided: 0
    },
    issues: [],
    suggestions: [],
    confidence: 'low'
  };

  // 1. Analyze answer quality and length
  let totalAnswerLength = 0;
  let meaningfulAnswers = 0;
  let totalAnswers = answerEntries.length;
  
  for (const [key, value] of answerEntries) {
    const answer = typeof value === 'string' ? value : (value as any)?.answer || '';
    const question = typeof value === 'string' ? key : (value as any)?.question || key;
    
    // Check if answer is meaningful (not just 1-3 characters)
    if (answer.length >= 10) {
      meaningfulAnswers++;
      totalAnswerLength += answer.length;
    } else if (answer.length <= 3) {
      assessment.issues.push(`Answer "${answer}" is too short for question "${question}"`);
    }
  }

  // Calculate answer quality metrics
  assessment.breakdown.answerQuality = totalAnswers > 0 ? (meaningfulAnswers / totalAnswers) * 100 : 0;
  assessment.breakdown.answerLength = totalAnswers > 0 ? Math.min((totalAnswerLength / totalAnswers) / 5, 100) : 0; // Normalize to 100

  // 2. Check service specificity
  if (matterData.service && matterData.service !== 'General Inquiry') {
    assessment.breakdown.serviceSpecificity = 100;
  } else if (matterData.service === 'General Inquiry') {
    assessment.breakdown.serviceSpecificity = 50;
    assessment.suggestions.push('Consider specifying the exact type of legal matter');
  } else {
    assessment.breakdown.serviceSpecificity = 0;
    assessment.issues.push('No legal service area specified');
  }

  // 3. Analyze content for urgency indicators
  const urgencyKeywords = ['urgent', 'emergency', 'immediate', 'asap', 'quickly', 'soon', 'deadline', 'court date', 'hearing'];
  const content = JSON.stringify(answers).toLowerCase();
  const hasUrgency = urgencyKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.urgencyIndication = hasUrgency ? 100 : 0;

  // 4. Check for evidence/documentation mentions
  const evidenceKeywords = ['document', 'contract', 'letter', 'email', 'text', 'photo', 'video', 'receipt', 'bill', 'court order', 'agreement'];
  const hasEvidence = evidenceKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.evidenceMentioned = hasEvidence ? 100 : 0;

  // 5. Check for timeline information
  const timelineKeywords = ['yesterday', 'today', 'tomorrow', 'last week', 'last month', 'next week', 'next month', 'date', 'when', 'since'];
  const hasTimeline = timelineKeywords.some(keyword => content.includes(keyword));
  assessment.breakdown.timelineProvided = hasTimeline ? 100 : 0;

  // 6. Calculate overall score with weighted components
  const weights = {
    answerQuality: 0.25,
    answerLength: 0.20,
    serviceSpecificity: 0.15,
    urgencyIndication: 0.10,
    evidenceMentioned: 0.10,
    timelineProvided: 0.10,
    answerCompleteness: 0.10
  };

  assessment.score = Math.round(
    assessment.breakdown.answerQuality * weights.answerQuality +
    assessment.breakdown.answerLength * weights.answerLength +
    assessment.breakdown.serviceSpecificity * weights.serviceSpecificity +
    assessment.breakdown.urgencyIndication * weights.urgencyIndication +
    assessment.breakdown.evidenceMentioned * weights.evidenceMentioned +
    assessment.breakdown.timelineProvided * weights.timelineProvided +
    (totalAnswers >= 3 ? 100 : totalAnswers * 33.33) * weights.answerCompleteness
  );

  // 7. Determine if ready for lawyer
  assessment.readyForLawyer = assessment.score >= 70 && meaningfulAnswers >= 2;

  // 8. Set confidence level
  if (assessment.score >= 80 && meaningfulAnswers >= 3) {
    assessment.confidence = 'high';
  } else if (assessment.score >= 60 && meaningfulAnswers >= 2) {
    assessment.confidence = 'medium';
  } else {
    assessment.confidence = 'low';
  }

  // 9. Generate suggestions based on issues
  if (assessment.breakdown.answerQuality < 50) {
    assessment.suggestions.push('Please provide more detailed answers to the questions');
  }
  if (assessment.breakdown.evidenceMentioned === 0) {
    assessment.suggestions.push('Consider mentioning any relevant documents or evidence');
  }
  if (assessment.breakdown.timelineProvided === 0) {
    assessment.suggestions.push('Include timeline information about when events occurred');
  }
  if (totalAnswers < 3) {
    assessment.suggestions.push('Answer more questions to provide a complete picture');
  }

  return assessment;
} 