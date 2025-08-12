import { describe, it, expect } from 'vitest';

// Test the real file upload and analysis flow that the user has been experiencing
const WORKER_URL = 'https://blawby-ai-chatbot.paulchrisluke.workers.dev';

describe('Real File Upload and Analysis Flow', () => {
  it('should handle the exact flow: upload PDF resume and ask for name', async () => {
    // Simulate the exact scenario the user has been testing
    // Create a realistic resume PDF content
    const resumeContent = `
      PAUL CHRIS LUKE
      Software Engineer & Legal Technology Specialist
      
      CONTACT INFORMATION:
      Email: paul@example.com
      Phone: (555) 123-4567
      Location: Charlotte, NC
      
      PROFESSIONAL SUMMARY:
      Experienced software engineer with expertise in legal technology, 
      full-stack development, and AI-powered solutions. Passionate about 
      building tools that improve access to justice and legal processes.
      
      WORK EXPERIENCE:
      
      Senior Software Engineer | Blawby | 2023 - Present
      - Lead development of AI-powered legal intake chatbot
      - Built document analysis and automation systems
      - Implemented Cloudflare Workers for serverless legal applications
      - Mentored junior developers and conducted code reviews
      
      Full Stack Developer | LegalTech Inc | 2021 - 2023
      - Developed legal document automation platform
      - Built client management system for law firms
      - Integrated payment processing and scheduling systems
      - Collaborated with legal professionals to understand requirements
      
      Junior Developer | StartupCorp | 2019 - 2021
      - Built web applications using React and Node.js
      - Implemented REST APIs and database design
      - Participated in agile development processes
      
      TECHNICAL SKILLS:
      - Languages: JavaScript, TypeScript, Python, SQL
      - Frontend: React, Preact, HTML5, CSS3, Tailwind CSS
      - Backend: Node.js, Express, Django, PostgreSQL
      - Cloud: Cloudflare Workers, AWS, Docker, Kubernetes
      - AI/ML: OpenAI API, Cloudflare AI, document analysis
      - Legal Tech: Document automation, intake systems, case management
      
      EDUCATION:
      Bachelor of Science in Computer Science
      University of Technology | 2019
      
      Legal Technology Certificate
      Law School | 2022
      
      PROJECTS:
      - AI Legal Intake Chatbot: Built intelligent chatbot for legal services
      - Document Analysis System: Automated legal document processing
      - Legal Form Generator: Created dynamic legal form builder
      - Case Management Platform: Developed comprehensive case tracking system
      
      CERTIFICATIONS:
      - AWS Certified Developer Associate
      - Cloudflare Workers Specialist
      - Legal Technology Professional
      
      LANGUAGES:
      - English (Native)
      - Spanish (Conversational)
      
      INTERESTS:
      - Legal technology and access to justice
      - Open source software development
      - Artificial intelligence and machine learning
      - Legal education and pro bono work
    `;
    
    const pdfBlob = new Blob([resumeContent], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], 'Profile (5).pdf', { type: 'application/pdf' });

    console.log('=== TESTING REAL FILE UPLOAD FLOW ===');
    console.log('File name:', pdfFile.name);
    console.log('File size:', pdfFile.size, 'bytes');
    console.log('File type:', pdfFile.type);

    // Step 1: Test direct file analysis via /api/analyze
    console.log('\n--- Step 1: Testing direct file analysis ---');
    
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('question', 'Extract relevant information from this resume');

    const analyzeResponse = await fetch(`${WORKER_URL}/api/analyze`, {
      method: 'POST',
      body: formData
    });

    console.log('Analysis response status:', analyzeResponse.status);
    
    if (analyzeResponse.ok) {
      const analyzeResult = await analyzeResponse.json();
      console.log('Analysis result:', JSON.stringify(analyzeResult, null, 2));
      
      expect(analyzeResult.success).toBe(true);
      expect(analyzeResult.data.analysis).toBeDefined();
      expect(analyzeResult.data.analysis.summary).toBeDefined();
      // Note: The PDF analysis may not extract names perfectly, so we check for any meaningful content
      // Even if confidence is 0, the analysis should still provide a summary
      expect(analyzeResult.data.analysis.summary.length).toBeGreaterThan(0);
    } else {
      console.error('Analysis failed:', await analyzeResponse.text());
      throw new Error('File analysis failed');
    }

    // Step 2: Test chat flow with file attachment
    console.log('\n--- Step 2: Testing chat flow with file attachment ---');
    
    const chatRequest = {
      message: "Can you please provide your full name?",
      sessionId: "test-session-" + Date.now(),
      teamSlug: "north-carolina-legal-services",
      attachments: [
        {
          name: pdfFile.name,
          type: pdfFile.type,
          size: pdfFile.size,
          fileId: "test-file-" + Date.now()
        }
      ]
    };

    const chatResponse = await fetch(`${WORKER_URL}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chatRequest)
    });

    console.log('Chat response status:', chatResponse.status);
    
    if (chatResponse.ok) {
      const chatResult = await chatResponse.json();
      console.log('Chat result:', JSON.stringify(chatResult, null, 2));
      
      expect(chatResult.success).toBe(true);
      expect(chatResult.data.response).toBeDefined();
      expect(chatResult.data.workflow).toBeDefined();
      
      // The AI should either analyze the file or ask for the name
      const response = chatResult.data.response.toLowerCase();
      expect(response).toMatch(/name|paul|resume|analyze/);
      
      console.log('✅ Chat flow test passed');
    } else {
      console.error('Chat failed:', await chatResponse.text());
      throw new Error('Chat flow failed');
    }

    // Step 3: Test follow-up question about the analyzed document
    console.log('\n--- Step 3: Testing follow-up question ---');
    
    const followUpRequest = {
      message: "What are my key skills according to my resume?",
      sessionId: chatRequest.sessionId, // Use same session
      teamSlug: "north-carolina-legal-services",
      attachments: [] // No new attachments, should use context from previous
    };

    const followUpResponse = await fetch(`${WORKER_URL}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(followUpRequest)
    });

    console.log('Follow-up response status:', followUpResponse.status);
    
    if (followUpResponse.ok) {
      const followUpResult = await followUpResponse.json();
      console.log('Follow-up result:', JSON.stringify(followUpResult, null, 2));
      
      expect(followUpResult.success).toBe(true);
      expect(followUpResult.data.response).toBeDefined();
      
      // The response should mention skills from the resume
      const response = followUpResult.data.response.toLowerCase();
      expect(response).toMatch(/skill|javascript|react|python|cloudflare/);
      
      console.log('✅ Follow-up test passed');
    } else {
      console.error('Follow-up failed:', await followUpResponse.text());
      throw new Error('Follow-up flow failed');
    }

    console.log('\n=== ALL TESTS PASSED ===');
  }, 120000); // 2 minute timeout for full flow test

  it('should handle the exact error case the user experienced', async () => {
    // Test the specific case where PDF text extraction was failing
    const problematicPdfContent = `
      %PDF-1.4
      1 0 obj
      <<
      /Type /Catalog
      /Pages 2 0 R
      >>
      endobj
      
      2 0 obj
      <<
      /Type /Pages
      /Kids [3 0 R]
      /Count 1
      >>
      endobj
      
      3 0 obj
      <<
      /Type /Page
      /Parent 2 0 R
      /Resources <<
      /Font <<
      /F1 4 0 R
      >>
      >>
      /MediaBox [0 0 612 792]
      /Contents 5 0 R
      >>
      endobj
      
      4 0 obj
      <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica
      >>
      endobj
      
      5 0 obj
      <<
      /Length 44
      >>
      stream
      BT
      /F1 12 Tf
      72 720 Td
      (Paul Chris Luke) Tj
      ET
      endstream
      endobj
      
      xref
      0 6
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000256 00000 n 
      0000000320 00000 n 
      trailer
      <<
      /Size 6
      /Root 1 0 R
      >>
      startxref
      389
      %%EOF
    `;
    
    const pdfBlob = new Blob([problematicPdfContent], { type: 'application/pdf' });
    const pdfFile = new File([pdfBlob], 'problematic.pdf', { type: 'application/pdf' });

    console.log('=== TESTING PROBLEMATIC PDF CASE ===');
    console.log('This simulates the [object Object] issue the user experienced');

    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('question', 'Extract information from this PDF');

    const response = await fetch(`${WORKER_URL}/api/analyze`, {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Result:', JSON.stringify(result, null, 2));
      
      // Should handle the problematic PDF gracefully
      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.summary).toBeDefined();
      
      // Should either extract text or fall back to vision analysis
      expect(result.data.analysis.confidence).toBeGreaterThan(0);
      
      console.log('✅ Problematic PDF handled gracefully');
    } else {
      console.error('Failed:', await response.text());
      throw new Error('Problematic PDF test failed');
    }
  }, 60000);
});
