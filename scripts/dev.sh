#!/bin/bash

# Development script for Blawby AI Chatbot
# This script helps you start both the frontend and backend servers

echo "🚀 Starting Blawby AI Chatbot Development Environment"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "📡 Starting Cloudflare Worker (backend)..."
echo "   API will be available at: http://localhost:8787"
wrangler dev --port 8787 &
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 3

echo "🌐 Starting Vite development server (frontend)..."
echo "   Frontend will be available at: http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers are running!"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:8787"
echo "📊 API Health: http://localhost:8787/api/health"
echo ""
echo "💡 To switch between local and deployed API:"
echo "   Edit src/config/api.ts and change API_MODE to 'local' or 'deployed'"
echo ""
echo "🛑 Press Ctrl+C to stop all servers"

# Wait for background processes
wait 