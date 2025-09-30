import { createAuthClient } from "better-auth/client";
import { cloudflareClient } from "better-auth-cloudflare/client";

// Create the Better Auth client with Cloudflare plugin
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/api/auth`
    : "http://localhost:8787/api/auth", // Fallback for SSR
  plugins: [cloudflareClient()], // includes geolocation and R2 file features
});

// Export default for easier imports
export default authClient;