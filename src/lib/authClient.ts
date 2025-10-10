import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { cloudflareClient } from "better-auth-cloudflare/client";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin, // Use current origin for proxy
  plugins: [organizationClient(), cloudflareClient()],
  fetchOptions: {
    credentials: "include", // Important for CORS
  },
});

export type AuthClient = typeof authClient;

// Export individual methods for easier use
export const { signIn, signOut, signUp, getSession } = authClient;

