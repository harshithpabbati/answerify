# Migration Guide

This document outlines the breaking changes and migration steps for the Cloudflare and dependency upgrade.

## Version 0.1.0 - Major Upgrade

### Summary of Changes

- ✅ Upgraded Next.js from 14.2.4 to 15.5.12
- ✅ Upgraded React from 18.3.1 to 19.0.0
- ✅ Added Cloudflare Pages support
- ✅ Updated all dependencies to latest versions
- ✅ Fixed compatibility issues with new versions

### Breaking Changes

#### 1. Next.js 15 - Async Params

In Next.js 15, page params are now async. All dynamic routes must be updated:

**Before:**
```tsx
export default async function Page({ params: { slug } }: { params: { slug: string } }) {
  // Use slug directly
}
```

**After:**
```tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Use slug
}
```

**Affected Files:**
- `app/(header)/onboarding/[slug]/configurations/page.tsx`
- `app/(header)/onboarding/[slug]/email-forwarding/page.tsx`
- `app/org/[slug]/layout.tsx`
- `app/org/[slug]/page.tsx`
- `app/org/[slug]/[id]/page.tsx`

#### 2. Next.js 15 - Async cookies()

The `cookies()` function is now async in Next.js 15:

**Before:**
```tsx
const cookieStore = cookies();
```

**After:**
```tsx
const cookieStore = await cookies();
```

**Affected Files:**
- `lib/supabase/server.ts`

#### 3. OpenPanel API Changes

The OpenPanel package changed its exports and API:

**Before:**
```tsx
import { OpenpanelProvider } from '@openpanel/nextjs';

<OpenpanelProvider
  url="https://api.openpanel.dev"
  clientId="..."
  // ...
/>
```

**After:**
```tsx
import { OpenPanelComponent } from '@openpanel/nextjs';

<OpenPanelComponent
  clientId="..."
  // Note: 'url' prop removed, API URL is now default
  // ...
/>
```

**Affected Files:**
- `components/providers/index.tsx`

#### 4. OpenAI Client Initialization

OpenAI client can no longer be initialized at module level during build:

**Before:**
```tsx
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY!,
});

export async function POST() {
  // Use openai
}
```

**After:**
```tsx
function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_KEY!,
  });
}

export async function POST() {
  const openai = getOpenAI();
  // Use openai
}
```

**Affected Files:**
- `app/api/webhooks/reply/route.ts`
- `app/api/webhooks/embedding/route.ts`

### New Features

#### Cloudflare Pages Support

The project now includes full Cloudflare Pages support:

1. **Configuration Files:**
   - `wrangler.toml` - Cloudflare Workers/Pages configuration
   - `.dev.vars.example` - Local environment variables for Cloudflare
   - `.github/workflows/deploy.yml` - Automated deployment workflow

2. **Image Optimization:**
   - Custom image loader for Cloudflare CDN: `lib/cloudflare-image-loader.ts`
   - Automatic WebP/AVIF conversion
   - Edge caching

3. **Security Headers:**
   - HSTS, CSP, and other security headers configured in `next.config.mjs`
   - Cloudflare-specific optimizations

4. **Deployment:**
   - See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for complete guide

### Dependency Updates

Key package updates:

| Package | Old Version | New Version |
|---------|-------------|-------------|
| next | 14.2.4 | 15.5.12 |
| react | 18.3.1 | 19.0.0 |
| react-dom | 18.3.1 | 19.0.0 |
| @supabase/ssr | 0.3.0 | 0.8.0 |
| @supabase/supabase-js | 2.43.4 | 2.95.3 |
| openai | 4.51.0 | 4.104.0 |
| resend | 3.2.0 | 6.9.2 |
| @openpanel/nextjs | 0.0.10-beta | 1.1.3 |
| tailwindcss | 3.4.1 | 3.4.17 |
| typescript | 5.x | 5.7.3 |

### Migration Steps

1. **Update your environment:**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Install new dependencies
   npm install
   ```

2. **Update environment variables:**
   - Check `.env.example` for any new required variables
   - For Cloudflare deployment, also check `.dev.vars.example`

3. **Test your build:**
   ```bash
   npm run build
   ```

4. **Fix any custom code:**
   - Update any custom pages with dynamic params to use async params
   - Update any custom code using `cookies()` to await it
   - Update any custom OpenAI client usage

5. **Deploy:**
   - Follow the [Cloudflare Deployment Guide](./CLOUDFLARE_DEPLOYMENT.md)
   - Or continue using your existing Vercel deployment

### Troubleshooting

#### Build Errors

**Error: "params is not a Promise"**
- Solution: Update page components to use `Promise<{ param: string }>` type and await params

**Error: "cookies() returns Promise"**
- Solution: Add `await` before `cookies()` calls

**Error: "OpenpanelProvider not found"**
- Solution: Import `OpenPanelComponent` instead and remove `url` prop

#### Runtime Errors

**Error: "OpenAI API key missing during build"**
- Solution: Move OpenAI client initialization inside request handlers

### Rollback

If you need to rollback:

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Reinstall old dependencies
rm -rf node_modules package-lock.json
npm install
```

### Support

For issues or questions:
- Check [GitHub Issues](https://github.com/harshithpabbati/answerify/issues)
- Review [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- Review [React 19 Upgrade Guide](https://react.dev/blog/2024/12/05/react-19)

## Future Considerations

### Optional: Cloudflare AI Workers

Consider migrating from OpenAI to Cloudflare AI Workers for:
- Lower costs
- Better edge performance
- Integrated with Cloudflare ecosystem

See [Cloudflare AI documentation](https://developers.cloudflare.com/workers-ai/) for more info.

### Optional: Cloudflare R2 Storage

If you need file storage, consider Cloudflare R2:
- S3-compatible API
- No egress fees
- Better integration with Cloudflare Pages

### Optional: Cloudflare Email Routing

For email handling, Cloudflare Email Routing can complement or replace Resend:
- Free email forwarding
- Email Workers for custom processing
- Integrated with your domain
