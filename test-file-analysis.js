// Test script to demonstrate improved file analysis responses
// This simulates how the chatbot would respond to different document types

const mockFileAnalysis = {
  resume: {
    documentType: 'resume',
    summary: "This is a comprehensive resume showcasing strong leadership in analytics, CRO, and enterprise tracking systems. The candidate has extensive experience in data-driven decision making and team management.",
    key_facts: [
      "10+ years of experience in analytics and CRO",
      "Led teams of 15+ professionals",
      "Implemented enterprise-grade tracking systems",
      "Strong background in data-driven decision making"
    ],
    entities: {
      people: ["John Doe", "Jane Smith"],
      orgs: ["TechCorp", "DataAnalytics Inc"],
      dates: ["2020-2023", "2018-2020"]
    },
    action_items: [
      "Highlight AI/automation achievements",
      "Emphasize measurable results",
      "Tailor for specific role requirements"
    ],
    confidence: 0.92
  },
  legalDocument: {
    documentType: 'legal document',
    summary: "This appears to be a contract agreement with standard terms and conditions. Key clauses include payment terms, service delivery, and termination conditions.",
    key_facts: [
      "Standard contract agreement",
      "Payment terms: 30 days net",
      "Service delivery timeline specified",
      "Termination clause included"
    ],
    entities: {
      people: ["Contractor", "Client"],
      orgs: ["Service Provider LLC", "Client Corp"],
      dates: ["2024-01-15", "2024-12-31"]
    },
    action_items: [
      "Review payment terms carefully",
      "Verify service delivery timeline",
      "Understand termination conditions"
    ],
    confidence: 0.88
  },
  medicalDocument: {
    documentType: 'medical document',
    summary: "Medical report indicating treatment for injuries sustained in an accident. Contains diagnosis, treatment plan, and recovery timeline.",
    key_facts: [
      "Injury sustained in motor vehicle accident",
      "Treatment plan includes physical therapy",
      "Expected recovery time: 6-8 weeks",
      "Follow-up appointments scheduled"
    ],
    entities: {
      people: ["Patient", "Dr. Johnson"],
      orgs: ["City General Hospital", "Physical Therapy Center"],
      dates: ["2024-02-15", "2024-04-15"]
    },
    action_items: [
      "Document all medical expenses",
      "Track recovery progress",
      "Consider legal consultation for accident claims"
    ],
    confidence: 0.95
  }
};

// Simulate AI responses for different document types
function simulateAIResponse(fileAnalysis) {
  const { documentType, summary, key_facts, action_items, confidence } = fileAnalysis;
  
  let response = `I've analyzed your ${documentType} and found some interesting insights. `;
  
  // Add document-specific response
  switch (documentType) {
    case 'resume':
      response += `${summary} Your background in analytics and CRO is particularly impressive. `;
      response += `Based on what I see, I can help you with:\n`;
      response += `• Refining your resume for specific roles (CRO, CTO, Analytics Lead)\n`;
      response += `• Highlighting your AI/automation achievements\n`;
      response += `• Emphasizing measurable results and impact\n`;
      response += `• Restructuring for maximum recruiter impact\n\n`;
      response += `What specific role or industry would you like to target?`;
      break;
      
    case 'legal document':
      response += `${summary} This appears to be a standard contract with typical terms. `;
      response += `Based on my analysis, I can help you with:\n`;
      response += `• Reviewing key terms and conditions\n`;
      response += `• Identifying potential issues or concerns\n`;
      response += `• Understanding your rights and obligations\n`;
      response += `• Preparing for negotiations if needed\n\n`;
      response += `What aspect of this contract would you like me to focus on?`;
      break;
      
    case 'medical document':
      response += `${summary} This medical report contains important information about your treatment. `;
      response += `Based on what I see, I can help you with:\n`;
      response += `• Understanding your medical condition and treatment plan\n`;
      response += `• Documenting expenses for insurance or legal purposes\n`;
      response += `• Tracking your recovery progress\n`;
      response += `• Exploring legal options if this involves an accident\n\n`;
      response += `Are you dealing with insurance claims or considering legal action?`;
      break;
      
    default:
      response += `${summary} `;
      response += `Based on what I see, I can help you with:\n`;
      action_items.forEach(item => {
        response += `• ${item}\n`;
      });
      response += `\nWhat would you like to focus on?`;
  }
  
  return response;
}

// Test the responses
console.log('=== RESUME ANALYSIS ===');
console.log(simulateAIResponse(mockFileAnalysis.resume));
console.log('\n');

console.log('=== LEGAL DOCUMENT ANALYSIS ===');
console.log(simulateAIResponse(mockFileAnalysis.legalDocument));
console.log('\n');

console.log('=== MEDICAL DOCUMENT ANALYSIS ===');
console.log(simulateAIResponse(mockFileAnalysis.medicalDocument));
console.log('\n');

console.log('=== ANALYSIS METADATA ===');
Object.entries(mockFileAnalysis).forEach(([type, analysis]) => {
  console.log(`${type.toUpperCase()}:`);
  console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
  console.log(`  Key Facts: ${analysis.key_facts.length}`);
  console.log(`  Action Items: ${analysis.action_items.length}`);
  console.log(`  Entities: ${analysis.entities.people.length} people, ${analysis.entities.orgs.length} orgs, ${analysis.entities.dates.length} dates`);
  console.log('');
});
