import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { cloudflareClient } from "better-auth-cloudflare/client";
import { stripeClient } from "@better-auth/stripe/client";

// Safe baseURL computation for SSR/build-time compatibility
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Guard against undefined window in SSR/build-time
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  // Safe fallback for SSR/build-time
  return "";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [organizationClient(), cloudflareClient(), stripeClient({ subscription: true })],
  fetchOptions: {
    credentials: "include", // Important for CORS
  },
});

export type AuthClient = typeof authClient;

// Export individual methods for easier use
export const { signIn, signOut, signUp, getSession } = authClient;
