# Preact ChatGPT Clone

A full-featured, high-performance **ChatGPT interface clone** built with Preact. This project faithfully recreates the ChatGPT experience while adding powerful enhancements and maintaining excellent performance.

<h2 align="center">
  <img height="256" width="256" src="./src/assets/preact.svg">
</h2>

<p align="center">
  <strong>Total Bundle Size: ~40KB gzipped</strong><br>
  <small>HTML (1.2KB) + CSS (4.2KB) + JS (34.6KB)</small>
</p>

## 🤖 About

This project implements a **complete ChatGPT-like interface** with all the familiar features users expect, built on the lightweight Preact framework instead of React. Perfect for developers who want a ChatGPT-style interface without the overhead of heavier libraries.

## 🚀 Live Demo

Try it yourself:
- [chat.blawby.com](https://chat.blawby.com)
- [preact-chat-gpt-interface.pages.dev](https://preact-chat-gpt-interface.pages.dev)

## 💪 Performance 

- **Tiny Footprint**: ~40KB total gzipped bundle (compared to 100KB+ for typical React apps)
- **Fast Initial Load**: Under 200ms Time-to-Interactive on fast connections
- **No Framework Bloat**: Preact's 3KB core vs React's 40KB foundation
- **Optimized Rendering**: Virtual DOM diffing with batched updates
- **Efficient Media Handling**: Lazy loading for images and media files

## ✨ Features

### Core ChatGPT Features Implemented
- **Chat Interface** — Familiar ChatGPT-style conversation flow
- **Message Styling** — Markdown support with code blocks and syntax highlighting
- **Loading States** — Realistic typing indicators and loading states
- **Message History** — Virtualized list for performance with large conversation histories
- **Dark/Light Mode** — Automatic theme switching based on system preferences

### Enhanced Features
- **Media Attachments** — Send images, videos, and documents (not in original ChatGPT)
- **Audio Recording** — Record and send audio messages with waveform visualization
- **Camera Integration** — Capture and send photos directly from your device
- **Scheduling System** — Comprehensive appointment scheduling with date/time selection
- **Drag-and-Drop** — Full-screen file dropping with intuitive visual feedback
- **Flexible Positioning** — Widget mode (collapsible sidebar) or inline mode for different use cases
- **Parent Frame Communication** — Seamless integration with parent websites via postMessage API
- **Accessibility** — ARIA-compliant with keyboard navigation and screen reader support
- **iOS-style Scrollbars** — Elegant auto-hiding scrollbars with smooth animations
- **SSR Compatible** — Server-side rendering support for better SEO and performance

## 🗓️ Scheduling System

The chat interface includes a comprehensive consultation request system with three ways to initiate a request:

1. **User-initiated via button** - Users can click the "Consultation" button next to the file attachment button
2. **User-initiated via text** - The AI detects when users ask to request a consultation in their messages
3. **AI-initiated** - The AI can proactively suggest a consultation when appropriate

### Scheduling Features

- **Intuitive Date Selection** - 3×3 grid of dates with option to show more dates
- **Time Selection Workflow** 
  - Morning/Afternoon quick selection
  - 30-minute time slots within selected period
- **Timezone Awareness** - Automatic detection and display of user's timezone
- **Confirmation Cards** - Visual confirmation of consultation requests in the chat
- **Natural Conversation Flow** - All selections appear as natural text messages
- **Multiple Entry Points** - Start consultation request via button, text request, or AI suggestion

This scheduling system is built with components that match the application's design language, offering a seamless experience for requesting consultations, appointments, or any time-based contact from your team.

## 🧩 Why Preact?

This clone achieves a **full ChatGPT experience in just ~40KB** (gzipped) by using Preact instead of React:

- **Dramatically Smaller**: The entire app is smaller than React alone
- **Faster Load Times**: ~40KB total vs 100-300KB for typical React apps
- **API Compatibility**: Same API as React, making migration seamless
- **Better Mobile Experience**: Less JS means faster load times on mobile networks
- **Lower Memory Usage**: Requires less RAM to run smoothly
- **Same Modern Features**: Hooks, Context, etc. without the overhead

## 🔌 Embedding & Integration

The chat interface can be embedded in any website with two display options:

### Positioning Options

1. **Widget Mode** (default) - Appears as a collapsible chat widget in the bottom-right corner
   - High-contrast toggle button for easy access
   - Full-height sidebar when expanded
   - Automatically collapses on mobile devices for better UX

2. **Inline Mode** - Embeds directly within a page as a regular component
   - Always visible (no collapse/expand functionality)
   - Ideal for dedicated chat pages

### URL Parameters

Control behavior using URL parameters:

- `?position=widget` - Display as a collapsible widget (default)
- `?position=inline` - Display as an inline component
- `?teamId=YOUR_TEAM_ID` - Connect to a specific team context

Example:
```
https://chat.blawby.com/?position=widget&teamId=acme-corp
```

### Integration with chat.blawby.com

When embedded in chat.blawby.com:

1. **Auto-detection** - Automatically reads teamId from URL parameters
2. **Communication** - Uses postMessage API for parent-frame communication:
   - Notifies parent of open/closed state changes
   - Receives commands from parent frame
   - Syncs authentication context

### API Payload Format

The chat interface sends messages to the API in the following format:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "user message here"
    },
    {
      "role": "assistant",
      "content": "assistant response here"
    }
  ]
}
```

The messages array maintains the conversation history, with each message containing:
- `role`: Either "user" or "assistant"
- `content`: The actual message content

### Embedding Code Example

```html
<!-- Basic embedding -->
<iframe 
  src="https://chat.blawby.com/?position=widget&teamId=YOUR_TEAM_ID" 
  style="border: none; width: 100%; height: 600px;"
></iframe>

<!-- Advanced embedding with communication -->
<script>
  // Listen for chat state changes
  window.addEventListener('message', (event) => {
    if (event.data.type === 'chatStateChange') {
      console.log('Chat is now:', event.data.isOpen ? 'open' : 'closed');
    }
  });
  
  // Send command to chat
  function openChat() {
    const chatFrame = document.querySelector('iframe');
    chatFrame.contentWindow.postMessage({
      type: 'openChat'
    }, '*');
  }
</script>
```

## 🏗️ Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/paulchrisluke/preact-chat-gpt-interface.git
cd preact-chat-gpt-interface

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

This starts a dev server at http://localhost:5173/

### Testing Different Configurations

You can test different display modes locally by adding URL parameters:

```
# Test widget mode (collapsible, bottom-right)
http://localhost:5173/?position=widget

# Test inline mode (always visible)
http://localhost:5173/?position=inline

# Test with a mock team ID
http://localhost:5173/?position=widget&teamId=test-team
```

For mobile testing, use the browser's device emulation or connect a real device to your local network.

### Production Build

```bash
# Build for production
npm run build
```

This builds the app for production, emitting to `dist/`. It prerenders the app to static HTML for SEO benefits.

## 🌩️ Deployment

### Cloudflare Pages

Deploy with Cloudflare Pages for optimal performance:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Pages
npm run build && wrangler pages deploy dist --project-name=preact-chat-gpt-interface
```

## 📝 Roadmap

See [todo.md](./todo.md) for the development roadmap and upcoming features.

## 🧰 Technical Details

### Stack
- **Preact** — For lightweight UI rendering
- **TypeScript** — For type safety and better developer experience
- **Vite** — For fast development and optimized builds
- **CSS Variables** — For flexible theming and styling

### Code Structure
- `src/components/` — Reusable UI components (Message, InputArea, etc.)
- `src/utils/` — Utility functions and helpers
- `src/index.tsx` — Main application entry point
- `src/style.css` — Global styling

## 👥 Contributing

We welcome contributions from the community! Whether it's bug fixes, feature additions, or documentation improvements, your help is appreciated.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute to this project.

By contributing, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

MIT

---

Built with ❤️ by [Paul Chris Luke](https://github.com/paulchrisluke)
