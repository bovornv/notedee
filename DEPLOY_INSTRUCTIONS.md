# 🚀 Deploy Notedee to notedee.com via Vercel

## Quick Start (5 minutes)

### Step 1: Commit & Push to GitHub

```bash
cd /Users/bovorn/Desktop/aurasea/Projects/notedee

# Stage all changes
git add -A

# Commit
git commit -m "Prepare for Vercel deployment: add sheet music files and config"

# Push to GitHub
git push origin main
```

### Step 2: Deploy on Vercel

1. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub

2. **Click "Add New..." → "Project"**

3. **Import Repository**
   - Find `bovornv/notedee` in the list
   - Click "Import"

4. **Configure Project** (auto-detected, just verify):
   - Framework: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

5. **Click "Deploy"**
   - Wait 2-3 minutes for build
   - You'll get a URL like: `notedee-xxx.vercel.app`

### Step 3: Add Custom Domain (notedee.com)

1. **In Vercel Dashboard:**
   - Go to your project → **Settings** → **Domains**

2. **Add Domain:**
   - Enter: `notedee.com`
   - Click "Add"
   - Enter: `www.notedee.com`
   - Click "Add"

3. **Configure DNS** (choose one method):

   **Method A: Use Vercel Nameservers (Recommended)**
   - Copy the nameservers from Vercel
   - Go to your domain registrar (where you bought notedee.com)
   - Update nameservers to Vercel's nameservers
   - Wait 24-48 hours for propagation

   **Method B: Add DNS Records**
   - Add A record: `@` → `76.76.21.21`
   - Add CNAME: `www` → `cname.vercel-dns.com`
   - Wait 24-48 hours for propagation

4. **Verify Domain:**
   - Vercel will verify automatically
   - SSL certificate is auto-generated (free)

### Step 4: Verify Deployment

- ✅ Visit `notedee.com` (after DNS propagates)
- ✅ Test PDF loading from starter library
- ✅ Test user upload
- ✅ Test recording functionality
- ✅ Check mobile view

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)

### PDFs Don't Load
- Verify `/public/sheet-music/` files are committed to git
- Check browser console for CORS errors
- PDF.js worker loads from CDN (already configured)

### Domain Not Working
- DNS propagation takes 24-48 hours
- Use `dig notedee.com` to check DNS
- Verify domain is verified in Vercel dashboard

## What's Already Configured

✅ `vercel.json` - Vercel configuration  
✅ `next.config.js` - Next.js production settings  
✅ PDF.js worker - Configured for production  
✅ Security headers - Configured  
✅ Static assets - Optimized  

## Production Checklist

- [x] All code pushed to GitHub
- [x] Vercel config created
- [x] PDF files in `/public/sheet-music/`
- [ ] Deploy to Vercel
- [ ] Add custom domain
- [ ] Test all features
- [ ] Monitor performance

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Domain Setup: https://vercel.com/docs/concepts/projects/domains

