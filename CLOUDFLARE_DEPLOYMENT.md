# Deploying Answerify to Cloudflare Pages

This guide explains how to deploy Answerify to Cloudflare Pages with Workers integration.

## Prerequisites

1. A Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Authenticated with Cloudflare: `wrangler login`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.dev.vars` file for local development (copy from `.dev.vars.example`):

```bash
cp .dev.vars.example .dev.vars
```

Fill in your environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `OPENAI_KEY`
- `FIRECRAWL_API_KEY`

### 3. Local Development with Cloudflare

```bash
# Standard Next.js development
npm run dev

# Or use Wrangler for local Cloudflare Pages simulation
wrangler pages dev .next/server --compatibility-date=2024-01-01
```

## Deployment

### Option 1: Deploy via Wrangler CLI

```bash
# Build the application
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy .next/server --project-name=answerify
```

### Option 2: Deploy via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to "Pages" → "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.next/server`
   - **Root directory**: `/`
5. Add environment variables in the dashboard
6. Deploy!

### Option 3: CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to Cloudflare Pages on push to main branch.

## Environment Variables in Production

Set these in Cloudflare Pages dashboard under Settings → Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_BASE_URL` (your production URL)
- `RESEND_API_KEY`
- `OPENAI_KEY`
- `FIRECRAWL_API_KEY`

## Cloudflare Features

### Image Optimization

Answerify uses Cloudflare's built-in image optimization. Images are automatically:
- Resized to appropriate dimensions
- Converted to optimal formats (WebP, AVIF)
- Cached at the edge for fast delivery

### Caching

Static assets are cached at Cloudflare's edge for maximum performance:
- Static files: 1 year cache
- API routes: No cache
- Pages: Standard CDN cache

### Security Headers

Security headers are automatically applied via `next.config.mjs`:
- HSTS
- X-Frame-Options
- Content Security Policy
- And more...

## Custom Domain

1. Add your domain in Cloudflare Pages settings
2. Update `NEXT_PUBLIC_BASE_URL` environment variable
3. Configure DNS in Cloudflare Dashboard

## Monitoring

- View logs in Cloudflare Dashboard → Pages → Your Project → Functions
- Analytics available in Pages overview

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18+)
- Verify all environment variables are set
- Check build logs in Cloudflare Dashboard

### API Routes Not Working

- Ensure Functions are enabled in Pages settings
- Check environment variables are set for production
- Review Function logs for errors

### Images Not Loading

- Verify image paths are correct
- Check that Image Resizing is enabled in Cloudflare Dashboard
- Ensure remote image hostnames are allowed in `next.config.mjs`

## Migration from Vercel

If migrating from Vercel:

1. Update any Vercel-specific APIs
2. Replace `process.env` with Cloudflare bindings where needed
3. Test edge functions compatibility
4. Update DNS to point to Cloudflare

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Images](https://developers.cloudflare.com/images/)
