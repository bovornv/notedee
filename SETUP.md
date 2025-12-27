# Notedee MVP Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## First Time Setup

### 1. Authentication
- Go to `/login`
- Enter any email and password (mock auth for MVP)
- Click "สมัครสมาชิก" (Sign Up) or "เข้าสู่ระบบ" (Log In)
- You'll be redirected to the practice page

### 2. Practice Flow
1. **Select a piece:**
   - Click "เลือกเพลง" (Select Piece)
   - Choose from public domain pieces or upload your own PDF/image

2. **Start recording:**
   - Click "บันทึก" (Record)
   - Allow microphone access when prompted
   - Play your violin

3. **Stop and analyze:**
   - Click "หยุด" (Stop)
   - Wait for analysis (mock analysis for MVP)
   - View results with color-coded feedback

### 3. Metronome (Optional)
- Toggle metronome on/off
- Adjust tempo slider (60-180 BPM)

## Features

### Free Tier
- 3 practice sessions per day
- Basic feedback (green/yellow/red)
- Practice history

### Paid Tier (Future)
- Unlimited sessions
- Detailed bar-by-bar feedback
- Advanced analytics

## Project Structure

```
/app              # Next.js pages
  /login          # Authentication
  /practice       # Main practice page
  /results        # Feedback display
  /progress       # Charts and stats
  /profile        # User settings

/components       # React components
  Navbar.tsx
  SheetMusicViewer.tsx
  Metronome.tsx
  SessionLimitBanner.tsx

/lib              # Utilities
  audioRecorder.ts      # Web Audio API recording
  audioAnalysis.ts      # Pitch detection & analysis
  sessionLimits.ts      # Free tier limits
  translations.ts       # i18n

/store            # Zustand state
  authStore.ts
  practiceStore.ts

/types            # TypeScript types
```

## Development Notes

### Mock Data
- Authentication uses localStorage (no real backend)
- Audio analysis uses simplified pitch detection
- Practice history is mocked
- Expected notes are hardcoded (should come from sheet music parsing)

### Browser Compatibility
- Requires modern browser with Web Audio API
- Microphone access required
- PDF.js for PDF rendering
- Canvas API for image rendering

### Known Limitations (MVP)
1. **Sheet Music Parsing:** Expected notes are hardcoded. In production, integrate MusicXML/MEI parsing.
2. **Audio Analysis:** Simplified pitch detection. Production needs more sophisticated rhythm/timing analysis.
3. **File Storage:** User uploads stored in memory. Need cloud storage (Vercel Blob/Supabase).
4. **Database:** All data in localStorage. Need PostgreSQL/Supabase for production.

## Next Steps for Production

1. **Backend API:**
   - User authentication (NextAuth.js or Supabase)
   - Practice session storage
   - File upload handling

2. **Sheet Music Analysis:**
   - Integrate MusicXML parser
   - Extract expected notes automatically
   - Support more formats

3. **Advanced Audio Analysis:**
   - Rhythm detection
   - Timing accuracy
   - Dynamics analysis

4. **Payment Integration:**
   - Stripe for subscriptions
   - Payment flow
   - Subscription management

5. **Performance:**
   - Optimize audio processing
   - Lazy load components
   - Image optimization

## Troubleshooting

### App won't start
```bash
rm -rf .next node_modules
npm install
npm run dev
```

### Microphone not working
- Check browser permissions
- Use HTTPS (required for getUserMedia)
- Try different browser

### PDF not loading
- Check file path
- Ensure PDF is in `/public/samples/`
- Check browser console for errors

### Port already in use
```bash
npm run dev -- -p 3001
```

