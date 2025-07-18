// Simple service worker for Blawby Chat
// This prevents 404 errors when the browser tries to fetch sw.js

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients
  event.waitUntil(self.clients.claim());
});

// Handle fetch events (minimal implementation)
self.addEventListener('fetch', (event) => {
  // For now, just let the browser handle all requests normally
  // This prevents 404 errors for sw.js requests
}); 