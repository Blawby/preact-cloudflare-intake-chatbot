import { describe, it, expect } from 'vitest';
import { WORKER_URL } from '../../setup-real-api';

// Helper function to parse SSE events from response data
function parseSSEEvents(responseData: string) {
  return responseData
    .split('\n\n')
    .filter(chunk => chunk.trim().startsWith('data: '))
    .map(chunk => {
      const jsonStr = chunk.replace('data: ', '').trim();
      try {
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Helper function to handle streaming responses
async function handleStreamingResponse(response: Response, timeoutMs: number = 30000) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }
  
  let responseData = '';
  let done = false;
  const startTime = Date.now();
  
  while (!done) {
    // Calculate remaining timeout for this read operation
    const elapsed = Date.now() - startTime;
    const remainingTimeout = Math.max(0, timeoutMs - elapsed);
    
    if (remainingTimeout === 0) {
      reader.cancel();
      reader.releaseLock();
      throw new Error(`Streaming response timeout after ${timeoutMs}ms`);
    }
    
    // Race the read operation against a timeout
    const readPromise = reader.read();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Read timeout after ${remainingTimeout}ms`)), remainingTimeout);
    });
    
    try {
      const { value, done: streamDone } = await Promise.race([readPromise, timeoutPromise]);
      done = streamDone;
      if (value) {
        responseData += new TextDecoder().decode(value);
      }
    } catch (error) {
      reader.cancel();
      reader.releaseLock();
      throw new Error(`Streaming response timeout after ${timeoutMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Check if we have a completion event by parsing SSE events
    const events = parseSSEEvents(responseData);
    
    // Check if any parsed event has type === "complete"
    if (events.some(event => event.type === 'complete')) {
      break;
    }
  }
  
  reader.releaseLock();
  
  // Parse final SSE data and return all events
  return parseSSEEvents(responseData);
}

describe('Matter Creation API Integration - Real API', () => {
  const BASE_URL = WORKER_URL;

  describe('Matter Creation via Agent Stream', () => {
    it('should create a matter via agent stream', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-matter-creation',
          messages: [
            { role: 'user', content: 'I need help with employment law, I was fired from my job' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For employment law, expect both text response and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });

    it('should handle matter creation with contact form', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-matter-contact',
          messages: [
            { role: 'user', content: 'I need a lawyer for my divorce case' },
            { role: 'assistant', content: 'I can help with that. Can you tell me more about your situation?' },
            { role: 'user', content: 'My spouse and I want to separate. I need legal representation.' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For divorce/contact form, expect text response and contact form
      const textEvents = events.filter(event => event.type === 'text');
      const contactFormEvents = events.filter(event => event.type === 'contact_form');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(contactFormEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate contact form event structure
      const contactFormEvent = contactFormEvents[0];
      expect(contactFormEvent).toHaveProperty('type', 'contact_form');
      expect(contactFormEvent).toHaveProperty('data');
      expect(contactFormEvent.data).toHaveProperty('fields');
      expect(Array.isArray(contactFormEvent.data.fields)).toBe(true);
    });

    it('should handle business law matter creation', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-business-matter',
          messages: [
            { role: 'user', content: 'I need help with a contract dispute with my business partner' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For business law, expect both text response and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });

    it('should handle criminal law matter creation', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-criminal-matter',
          messages: [
            { role: 'user', content: 'I was arrested and need a criminal defense lawyer' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For criminal law, expect text response, contact form, and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const contactFormEvents = events.filter(event => event.type === 'contact_form');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(contactFormEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate contact form event structure
      const contactFormEvent = contactFormEvents[0];
      expect(contactFormEvent).toHaveProperty('type', 'contact_form');
      expect(contactFormEvent).toHaveProperty('data');
      expect(contactFormEvent.data).toHaveProperty('fields');
      expect(Array.isArray(contactFormEvent.data.fields)).toBe(true);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });

    it('should handle personal injury matter creation', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-injury-matter',
          messages: [
            { role: 'user', content: 'I was injured in a car accident and need legal help' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For personal injury, expect text response, contact form, and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const contactFormEvents = events.filter(event => event.type === 'contact_form');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(contactFormEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate contact form event structure
      const contactFormEvent = contactFormEvents[0];
      expect(contactFormEvent).toHaveProperty('type', 'contact_form');
      expect(contactFormEvent).toHaveProperty('data');
      expect(contactFormEvent.data).toHaveProperty('fields');
      expect(Array.isArray(contactFormEvent.data.fields)).toBe(true);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });

    it('should handle contract review matter creation', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-contract-matter',
          messages: [
            { role: 'user', content: 'I need someone to review a contract before I sign it' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For contract review, expect text response, contact form, and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const contactFormEvents = events.filter(event => event.type === 'contact_form');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(contactFormEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate contact form event structure
      const contactFormEvent = contactFormEvents[0];
      expect(contactFormEvent).toHaveProperty('type', 'contact_form');
      expect(contactFormEvent).toHaveProperty('data');
      expect(contactFormEvent.data).toHaveProperty('fields');
      expect(Array.isArray(contactFormEvent.data.fields)).toBe(true);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });

    it('should handle intellectual property matter creation', async () => {
      const response = await fetch(`${BASE_URL}/api/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'north-carolina-legal-services',
          sessionId: 'test-session-ip-matter',
          messages: [
            { role: 'user', content: 'I need help with trademark registration for my business' }
          ]
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      // Parse streaming response
      const events = await handleStreamingResponse(response);
      expect(events.length).toBeGreaterThan(0);
      
      // For intellectual property, expect text response, contact form, and matter canvas
      const textEvents = events.filter(event => event.type === 'text');
      const contactFormEvents = events.filter(event => event.type === 'contact_form');
      const matterCanvasEvents = events.filter(event => event.type === 'matter_canvas');
      
      expect(textEvents.length).toBeGreaterThan(0);
      expect(contactFormEvents.length).toBeGreaterThan(0);
      expect(matterCanvasEvents.length).toBeGreaterThan(0);
      
      // Validate text event structure
      const textEvent = textEvents[0];
      expect(textEvent).toHaveProperty('type', 'text');
      expect(textEvent).toHaveProperty('content');
      expect(typeof textEvent.content).toBe('string');
      expect(textEvent.content.length).toBeGreaterThan(0);
      
      // Validate contact form event structure
      const contactFormEvent = contactFormEvents[0];
      expect(contactFormEvent).toHaveProperty('type', 'contact_form');
      expect(contactFormEvent).toHaveProperty('data');
      expect(contactFormEvent.data).toHaveProperty('fields');
      expect(Array.isArray(contactFormEvent.data.fields)).toBe(true);
      
      // Validate matter canvas event structure
      const matterCanvasEvent = matterCanvasEvents[0];
      expect(matterCanvasEvent).toHaveProperty('type', 'matter_canvas');
      expect(matterCanvasEvent).toHaveProperty('data');
      expect(matterCanvasEvent.data).toHaveProperty('matter');
      expect(matterCanvasEvent.data.matter).toHaveProperty('type');
      expect(matterCanvasEvent.data.matter).toHaveProperty('description');
    });
  });
});