// Optimized Email Service
export class EmailService {
  constructor(private apiKey: string) {}
  
  async send(email: { from: string; to: string; subject: string; text: string }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(email),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Email failed: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
} 