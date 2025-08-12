#!/bin/bash

echo "🚀 Setting up Cloudflare AI for file analysis..."
echo ""

# Check if Cloudflare CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo "📋 Prerequisites:"
echo "   1. Cloudflare account with Workers AI enabled"
echo "   2. Cloudflare API token with Workers AI permissions"
echo "   3. Your Cloudflare Account ID"
echo ""

# Get Account ID
read -p "Enter your Cloudflare Account ID: " ACCOUNT_ID
if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ Account ID is required"
    exit 1
fi

# Get API Token
read -s -p "Enter your Cloudflare API Token: " API_TOKEN
echo ""
if [ -z "$API_TOKEN" ]; then
    echo "❌ API Token is required"
    exit 1
fi

# Clear the terminal line to hide the token from scrollback
printf '\r\033[K'
echo "✅ API Token received"

# Get Public URL
read -p "Enter your Worker's public URL (e.g., https://your-worker.your-subdomain.workers.dev): " PUBLIC_URL
if [ -z "$PUBLIC_URL" ]; then
    echo "❌ Public URL is required"
    exit 1
fi

echo ""
echo "🔧 Configuring environment variables..."

# Update wrangler.toml
sed -i.bak "s/CLOUDFLARE_ACCOUNT_ID = \"your_cloudflare_account_id_here\"/CLOUDFLARE_ACCOUNT_ID = \"$ACCOUNT_ID\"/" wrangler.toml
sed -i.bak "s|CLOUDFLARE_PUBLIC_URL = \"https://blawby-ai-chatbot.paulchrisluke.workers.dev\"|CLOUDFLARE_PUBLIC_URL = \"$PUBLIC_URL\"|" wrangler.toml

# Set the API token as a secret
echo "$API_TOKEN" | wrangler secret put CLOUDFLARE_API_TOKEN

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📝 Summary:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Public URL: $PUBLIC_URL"
echo "   API Token: [Set as secret]"
echo ""

# Clean up sensitive data from environment
unset API_TOKEN

echo "🚀 Next steps:"
echo "   1. Deploy your worker: wrangler deploy"
echo "   2. Test file analysis with a real file upload"
echo "   3. Monitor Cloudflare AI usage in your dashboard"
echo ""
echo "📊 To monitor usage:"
echo "   - Visit: https://dash.cloudflare.com/${ACCOUNT_ID}/workers/ai"
echo "   - Check your Workers AI usage and costs"
