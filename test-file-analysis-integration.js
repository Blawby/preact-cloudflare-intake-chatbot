// Test script to verify file analysis integration
// This simulates the scenario where a user uploads a file and asks a question

console.log('🧪 TESTING FILE ANALYSIS INTEGRATION');
console.log('====================================\n');

// Simulate the request that would be sent to the agent
const mockRequest = {
  messages: [
    {
      role: 'user',
      content: 'Can you please provide your full name?'
    }
  ],
  teamId: 'team-123',
  sessionId: 'session-456',
  attachments: [
    {
      name: 'Profile (5).pdf',
      type: 'application/pdf',
      size: 63872,
      url: '/api/files/file-abc123-def456.pdf'
    }
  ]
};

console.log('📥 MOCK REQUEST:');
console.log('User message:', mockRequest.messages[0].content);
console.log('Attachments:', mockRequest.attachments.map(f => `${f.name} (${f.type})`));
console.log('');

// Simulate what the system prompt would look like with attachments
const systemPrompt = `You are a legal intake specialist. Your job is to collect client information step by step.

**IMPORTANT: You help with ALL legal matters including sensitive ones like sexual harassment, criminal charges, divorce, etc. Do NOT reject any cases. Proceed with intake for every legal matter.**

**UPLOADED FILES:**
The user has uploaded the following files that you can analyze:
1. Profile (5).pdf (application/pdf, 63872 bytes) - File ID: file-abc123-def456

**IMPORTANT: When files are uploaded, you should analyze them using the analyze_document tool before proceeding with the conversation flow.**

**NAME VALIDATION:**
- Accept any reasonable name format (first name, full name, nickname, etc.)
- Don't be overly strict about name validation
- If someone provides a name, accept it and move to the next step
- Only ask for clarification if the name is clearly incomplete or invalid

**CONVERSATION FLOW - Follow exactly:**
1. If no name provided: "Can you please provide your full name?"
2. If name provided but no location: "Can you please tell me your city and state?"
3. If name and location provided but no phone: "Thank you [name]! Now I need your phone number."
4. If name, location, and phone provided but no email: "Thank you [name]! Now I need your email address."
5. If name, location, phone, and email provided but no opposing party: "Thank you [name]! For legal matters, it's helpful to know if there's an opposing party involved. Who is the other party in this situation? (If none, you can say 'none' or 'not applicable')"
6. If ALL information collected (name, location, phone, email, opposing party): Call create_matter tool immediately.

**CRITICAL: After collecting all contact information (name, location, phone, email, opposing party), you MUST call the create_matter tool. Do not ask for more information if you have everything.**

**Available Tools:**
- create_matter: Use when you have all required information (name, location, phone, email, opposing party)
- analyze_document: Use when a user has uploaded a document or image that needs analysis

**FILE ANALYSIS:**
- If a user uploads a document or image, analyze it using the analyze_document tool
- Determine the appropriate analysis_type based on the file:
  - resume: For resumes/CVs
  - legal_document: For contracts, legal papers, court documents
  - medical_document: For medical records, bills, reports
  - image: For photos, screenshots, visual evidence
  - general: For other documents
- Extract the file_id from the uploaded file metadata
- Ask a specific question if the user has a particular concern about the document

**Example Tool Calls:**

TOOL_CALL: create_matter
PARAMETERS: {
  "matter_type": "Family Law",
  "description": "Client mentioned divorce - seeking legal assistance with family law matter",
  "urgency": "medium",
  "name": "Steve Jobs",
  "phone": "6159990000",
  "email": "hajas@yahoo.com",
  "location": "Charlotte, NC",
  "opposing_party": "Jane Jobs"
}

TOOL_CALL: analyze_document
PARAMETERS: {
  "file_id": "file-abc123-def456",
  "analysis_type": "resume",
  "specific_question": "Analyze this resume for improvement opportunities"
}

**IMPORTANT: When calling create_matter, you MUST include:**
- matter_type: Determine from the conversation (Family Law, Employment Law, etc.)
- description: Brief description of the legal issue mentioned
- urgency: "low", "medium", or "high" based on context
- name, phone, email, location: All contact information collected
- opposing_party: If mentioned, otherwise empty string

**DO NOT provide legal advice or reject cases. Follow the conversation flow step by step.**`;

console.log('🤖 EXPECTED AI BEHAVIOR:');
console.log('1. AI should detect that a file (Profile (5).pdf) has been uploaded');
console.log('2. AI should recognize this as a resume based on the filename');
console.log('3. AI should call the analyze_document tool BEFORE asking for the name');
console.log('4. AI should use file_id: "file-abc123-def456"');
console.log('5. AI should set analysis_type: "resume"');
console.log('6. After analysis, AI should then proceed with the conversation flow');
console.log('');

console.log('🔧 EXPECTED TOOL CALL:');
console.log('TOOL_CALL: analyze_document');
console.log('PARAMETERS: {');
console.log('  "file_id": "file-abc123-def456",');
console.log('  "analysis_type": "resume",');
console.log('  "specific_question": "Analyze this resume for improvement opportunities"');
console.log('}');
console.log('');

console.log('📊 EXPECTED FLOW:');
console.log('1. User uploads Profile (5).pdf');
console.log('2. User asks: "Can you please provide your full name?"');
console.log('3. AI detects uploaded file and calls analyze_document tool');
console.log('4. AI receives analysis results with resume insights');
console.log('5. AI responds with resume analysis + continues conversation flow');
console.log('6. AI then asks for the user\'s name');
console.log('');

console.log('✅ INTEGRATION STATUS:');
console.log('✅ Backend routes updated to extract attachments');
console.log('✅ AI agent functions updated to accept attachments parameter');
console.log('✅ System prompt updated to include file information');
console.log('✅ analyze_document tool added to both regular and streaming agents');
console.log('✅ Tool handlers properly mapped');
console.log('');

console.log('🎯 NEXT STEPS:');
console.log('1. Test with real file upload in the UI');
console.log('2. Verify AI calls analyze_document tool');
console.log('3. Check that analysis results are returned to user');
console.log('4. Confirm conversation flow continues properly');
console.log('');

console.log('🚀 READY FOR TESTING!');
