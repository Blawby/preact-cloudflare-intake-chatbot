-- Update Blawby AI team configuration to include comprehensive legal services
-- This fixes the issue where Blawby AI was refusing to provide legal advice for Family Law matters

UPDATE teams 
SET config = json_patch(config, json('{
  "availableServices": [
    "Family Law", 
    "Business Law", 
    "Contract Review", 
    "Intellectual Property", 
    "Employment Law", 
    "Personal Injury", 
    "Criminal Law", 
    "Civil Law", 
    "General Consultation"
  ],
  "serviceQuestions": {
    "Family Law": [
      "I understand this is a difficult time. Can you tell me what type of family situation you are dealing with?",
      "What are the main issues you are facing?",
      "Have you taken any steps to address this situation?",
      "What would a good outcome look like for you?"
    ],
    "Business Law": [
      "What type of business entity are you operating or planning to start?",
      "What specific legal issue are you facing with your business?",
      "Are you dealing with contracts, employment issues, or regulatory compliance?",
      "What is the size and scope of your business operations?"
    ],
    "Contract Review": [
      "What type of contract do you need reviewed?",
      "What is the value or importance of this contract?",
      "Are there any specific concerns or red flags you have noticed?",
      "What is the timeline for this contract?"
    ],
    "Intellectual Property": [
      "What type of intellectual property are you dealing with?",
      "Are you looking to protect, license, or enforce IP rights?",
      "What is the nature of your IP (patent, trademark, copyright, trade secret)?",
      "What is the commercial value or importance of this IP?"
    ],
    "Employment Law": [
      "What specific employment issue are you facing?",
      "Are you an employer or employee in this situation?",
      "Have you taken any steps to address this issue?",
      "What is the timeline or urgency of your situation?"
    ],
    "Personal Injury": [
      "Can you tell me about the incident that caused your injury?",
      "What type of injuries did you sustain?",
      "Have you received medical treatment?",
      "What is the current status of your recovery?"
    ],
    "Criminal Law": [
      "What type of legal situation are you facing?",
      "Are you currently facing charges or under investigation?",
      "Have you been arrested or contacted by law enforcement?",
      "Do you have an attorney representing you?"
    ],
    "Civil Law": [
      "What type of civil legal issue are you dealing with?",
      "Are you involved in a lawsuit or considering legal action?",
      "What is the nature of the dispute?",
      "What outcome are you hoping to achieve?"
    ],
    "General Consultation": [
      "Thanks for reaching out! I would love to help. Can you tell me what legal situation you are dealing with?",
      "Have you been able to take any steps to address this yet?",
      "What would a good outcome look like for you?",
      "Do you have any documents or information that might be relevant?"
    ]
  },
  "introMessage": "Hello! I am Blawby AI, your intelligent legal assistant. I can help you with family law, business law, contract review, intellectual property, employment law, personal injury, criminal law, civil law, and general legal consultation. How can I assist you today?"
}'))
WHERE slug = 'blawby-ai';
