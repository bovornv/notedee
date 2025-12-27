# Notedee - Quick Start Guide

## ✅ Server Status

The dev server should be starting. Check your terminal for:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
✓ Ready in X seconds
```

## 🚀 Access the App

1. **Open Chrome** and go to: `http://localhost:3000`

2. **If you see 404 errors:**
   - Wait 10-15 seconds for compilation to finish
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

## 📋 First Time Setup

### Step 1: Login
- Go to `/login`
- Enter **any email and password** (mock authentication)
- Click "เข้าสู่ระบบ" (Log In) or "สมัครสมาชิก" (Sign Up)

### Step 2: Main Page
You'll see 3 buttons:
- **เริ่มฝึกซ้อม** (Start Practice) → Practice flow
- **สำรวจเพลง** (Explore Songs) → Browse songs
- **โปรไฟล์** (Profile) → Settings

## 🎯 Test Practice Flow

1. Click **"เริ่มฝึกซ้อม"**
2. Click **"เลือกเพลง"** → Upload PDF/image OR go to "สำรวจเพลง"
3. Once sheet music loads, click **"บันทึก"** (Record)
4. **Allow microphone access** when prompted
5. Play your violin (or make any sound)
6. Click **"หยุด"** (Stop) - button turns red
7. Click **"วิเคราะห์ผลการเล่น"** (Analyze Performance)
8. View results with color-coded feedback

## 🎵 Features to Test

- ✅ **Microphone** - Visual indicator shows recording status
- ✅ **Metronome** - Toggle ON/OFF, adjust tempo (60-180 BPM)
- ✅ **Sheet Music Upload** - PDF or images
- ✅ **Audio Analysis** - Real pitch detection and feedback
- ✅ **Language Toggle** - Thai ↔ English (in Profile)
- ✅ **Profile Picture** - Upload optional avatar
- ✅ **Explore Songs** - Browse public domain pieces

## 🐛 Troubleshooting

### App won't load
```bash
# Stop server (Ctrl+C), then:
rm -rf .next
npm run dev
```

### Port 3000 in use
```bash
npm run dev -- -p 3001
# Then go to http://localhost:3001
```

### Still seeing errors?
1. Check terminal for compilation errors
2. Check browser console (F12) for runtime errors
3. Make sure all dependencies installed: `npm install`

## 📁 Project Structure

```
/app              # Pages (main, practice, explore, profile, etc.)
/components       # React components
/lib              # Utilities (audio, translations, etc.)
/store            # Zustand state management
/types            # TypeScript types
/public           # Static assets
```

## ✨ What's Working

- ✅ User authentication (localStorage-based)
- ✅ Practice flow (record → stop → analyze → results)
- ✅ Sheet music viewer (PDF/images)
- ✅ Audio recording & analysis
- ✅ Visual feedback overlay
- ✅ Metronome with tempo control
- ✅ Language switching
- ✅ Profile management
- ✅ Session limits (free tier: 3/day)

---

**Ready to use!** Open `http://localhost:3000` in Chrome and start practicing! 🎻

