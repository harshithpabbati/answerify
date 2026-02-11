# Answerify - Your AI-Powered Support Ticket Superhero

Stop ticket trouble! Answerify uses the power of AI to automatically answer your customer questions, saving you time and delighting your customers.

## 🚀 Tech Stack

- **Frontend**: Next.js 15.5 with React 19
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: OpenAI (Embeddings & GPT)
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages (recommended) or Vercel

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your environment variables in .env
```

## 🌐 Deployment

### Cloudflare Pages (Recommended)

This project is optimized for Cloudflare Pages with built-in:
- Edge caching and CDN
- Image optimization
- Security headers
- Automatic deployments via GitHub Actions

See [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Cloudflare

1. Connect your GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `.next/server`
4. Add environment variables
5. Deploy!

## 🔧 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🔐 Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
RESEND_API_KEY=your_resend_api_key
OPENAI_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
```

See `.env.example` or `.dev.vars.example` for Cloudflare Workers.

## ✨ Features

- 🤖 AI-powered automatic responses
- 📧 Email integration with custom forwarding
- 🔍 Semantic search using embeddings
- 👥 Team collaboration and organization management
- 📊 Dashboard for managing support tickets
- 🎨 Modern, responsive UI with dark mode

## 📝 Recent Updates

### Latest (v0.1.0)

- ⬆️ Upgraded to Next.js 15 and React 19
- ☁️ Added Cloudflare Pages support with optimized configuration
- 🖼️ Integrated Cloudflare Image Optimization
- 🔒 Enhanced security headers
- 📦 Updated all dependencies to latest versions
- 🚀 Improved build performance and edge runtime support

## 📚 Documentation

- [Cloudflare Deployment Guide](./CLOUDFLARE_DEPLOYMENT.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
