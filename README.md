# Notedee MVP

A practice tool for violin students in Thailand. Notedee listens to students practicing violin, analyzes their playing, and gives clear visual feedback directly on the music.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Audio Analysis**: Web Audio API + pitchfinder
- **Sheet Music**: PDF.js
- **Charts**: Recharts

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
/app              # Next.js app router pages
/components       # React components
/lib              # Utilities and helpers
/types            # TypeScript types
/store            # Zustand stores
/public           # Static assets
```

## Features

- ✅ User authentication (signup/login)
- ✅ Music selection (public domain + user upload)
- ✅ Recording with metronome
- ✅ Audio analysis (pitch, rhythm, timing)
- ✅ Visual feedback on sheet music
- ✅ Practice history and streaks
- ✅ Progress tracking
- ✅ Free/Paid tier system

