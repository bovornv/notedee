# Deploy Notedee to Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free account works)
2. **Domain**: Ensure you own `notedee.com` and can configure DNS
3. **GitHub**: Code should be pushed to GitHub (already done: https://github.com/bovornv/notedee.git)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select the `bovornv/notedee` repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** (if needed)
   - Add any environment variables in the "Environment Variables" section
   - For now, none are required

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)

6. **Configure Custom Domain**
   - After deployment, go to Project Settings → Domains
   - Add `notedee.com` and `www.notedee.com`
   - Follow DNS configuration instructions:
     - Add CNAME record: `www` → `cname.vercel-dns.com`
     - Add A record: `@` → Vercel's IP (provided in dashboard)
     - Or use Vercel's nameservers (recommended)

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Deploy to production
vercel --prod

# Link custom domain
vercel domains add notedee.com
```

## Post-Deployment Checklist

- [ ] Verify site loads at `notedee.com`
- [ ] Test PDF loading from `/sheet-music/` directory
- [ ] Test user upload functionality
- [ ] Test recording functionality
- [ ] Verify all 10 starter songs load correctly
- [ ] Check mobile responsiveness
- [ ] Test language toggle (Thai/English)

## Troubleshooting

### PDF.js Worker Issues
If PDFs don't load, ensure:
- PDF.js worker is loaded from CDN (already configured)
- CORS headers are properly set (configured in `next.config.js`)

### Build Errors
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects, but can set in `package.json`)

### Domain Issues
- DNS propagation can take 24-48 hours
- Use `dig notedee.com` to check DNS records
- Verify domain is verified in Vercel dashboard

## Production Optimizations

The app is already configured for production:
- ✅ Next.js 14 App Router
- ✅ Static asset optimization
- ✅ PDF.js worker configured
- ✅ Security headers configured
- ✅ Build optimizations enabled

## Monitoring

- Vercel provides analytics and monitoring
- Check deployment logs in Vercel dashboard
- Monitor error rates and performance

