# Cloudflare AI Setup Guide

This guide will help you configure Cloudflare Workers AI for the vision analysis feature.

## Prerequisites

1. **Cloudflare Account**: You need an active Cloudflare account
2. **Workers Plan**: Ensure you have a Workers plan that supports AI (Free plan includes limited AI usage)
3. **API Token**: Create an API token with Workers AI permissions

## Step 1: Get Your Cloudflare Account ID

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Look at the URL or check the right sidebar - your Account ID is displayed there
3. It's a 32-character hexadecimal string (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

## Step 2: Create an API Token

1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens) in your Cloudflare dashboard
2. Click **"Create Token"**
3. Choose **"Custom token"**
4. Configure the token with these permissions:
   - **Account**: Workers AI:Read
   - **Zone**: Workers AI:Read (if you want zone-specific access)
5. Set the **Account Resources** to include your account
6. Click **"Continue to summary"** and then **"Create Token"**
7. **Copy the token** - you won't be able to see it again!

## Step 3: Configure Environment Variables

### Option A: Using wrangler.toml (for development)

Update your `wrangler.toml` file:

```toml
[vars]
CLOUDFLARE_ACCOUNT_ID = "your_actual_account_id_here"
CLOUDFLARE_PUBLIC_URL = "https://your-worker.your-subdomain.workers.dev"

# Set the API token as a secret
# Run: wrangler secret put CLOUDFLARE_API_TOKEN
```

### Option B: Using wrangler secrets (recommended for production)

```bash
# Set your account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID

# Set your API token
wrangler secret put CLOUDFLARE_API_TOKEN

# Set your public URL
wrangler secret put CLOUDFLARE_PUBLIC_URL
```

### Option C: Using Cloudflare Dashboard (for production)

1. Go to your Workers dashboard
2. Select your worker
3. Go to **Settings** → **Variables**
4. Add the environment variables:
   - `CLOUDFLARE_ACCOUNT_ID`: Your account ID
   - `CLOUDFLARE_API_TOKEN`: Your API token
   - `CLOUDFLARE_PUBLIC_URL`: Your worker's public URL

## Step 4: Test the Configuration

Deploy your worker and test the vision analysis:

```bash
# Deploy to production
wrangler deploy

# Test the analyze endpoint
curl -X POST https://your-worker.your-subdomain.workers.dev/api/analyze \
  -F "file=@test-image.jpg" \
  -F "q=What do you see in this image?"
```

## Step 5: Monitor Usage

1. **Workers AI Usage**: Check your [Workers AI usage](https://dash.cloudflare.com/workers-ai) in the dashboard
2. **Logs**: Monitor your worker logs for analysis requests
3. **Costs**: Workers AI is included in your Workers plan - no additional charges

## Troubleshooting

### Common Issues

**"Cloudflare AI not configured"**
- Ensure `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set
- Check that the API token has the correct permissions

**"Unauthorized" errors**
- Verify your API token is correct
- Ensure the token has Workers AI permissions
- Check that the account ID matches your token's account

**"Model not found" errors**
- Ensure you're using the correct model name: `@cf/llava-1.5-7b-hf`
- Check that Workers AI is enabled for your account

**Image analysis not working**
- Verify `CLOUDFLARE_PUBLIC_URL` is set correctly
- Check that your R2 bucket is configured for file storage
- Ensure the image URL is publicly accessible

### Getting Help

- **Cloudflare Documentation**: [Workers AI](https://developers.cloudflare.com/workers-ai/)
- **Community**: [Cloudflare Community](https://community.cloudflare.com/)
- **Support**: Contact Cloudflare support if you have account-specific issues

## Security Best Practices

1. **API Token Security**:
   - Use the minimum required permissions
   - Rotate tokens regularly
   - Never commit tokens to version control

2. **Environment Variables**:
   - Use `wrangler secret` for sensitive values
   - Keep account IDs in version control (they're not sensitive)

3. **File Storage**:
   - Set appropriate cache headers for temporary files
   - Implement cleanup for analysis files
   - Validate file types and sizes

## Cost Optimization

- **Workers AI**: Included in your Workers plan
- **No per-request charges**: Unlike external APIs
- **Rate limiting**: Implement if needed to control usage
- **Caching**: Store analysis results to avoid re-processing

## Next Steps

Once configured, your vision analysis feature will:
1. Accept image and document uploads
2. Analyze them using Cloudflare's `llava-1.5-7b-hf` model
3. Return structured JSON results
4. Integrate seamlessly with your legal intake chatbot

The system is now fully self-contained within the Cloudflare ecosystem!
