# Troubleshooting Guide

## Favicon 404 Error

**This is harmless!** The favicon.ico 404 error doesn't prevent the app from working. Browsers automatically request `/favicon.ico` even if it doesn't exist.

**To fix (optional):**
1. Ignore it - the app works fine without it
2. Or add a favicon.ico file to `/public/favicon.ico`

## App Not Launching

### Step 1: Check Server Status

Look at your terminal. You should see:
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
✓ Ready in X seconds
```

**If you DON'T see "Ready":**
- Wait longer (first compile takes 30-60 seconds)
- Check for compilation errors in terminal
- Look for red error messages

### Step 2: Clean Restart

```bash
# Stop server (Ctrl+C)
cd /Users/bovorn/Desktop/aurasea/Projects/notedee
rm -rf .next
npm run dev
```

### Step 3: Check Browser

1. **Open:** `http://localhost:3000`
2. **Wait:** 10-15 seconds for compilation
3. **Hard refresh:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
4. **Check console:** Press F12, look for errors

### Step 4: Common Issues

**Port 3000 in use:**
```bash
npm run dev -- -p 3001
# Then go to http://localhost:3001
```

**Missing dependencies:**
```bash
npm install
```

**TypeScript errors:**
- Check terminal output
- Fix any type errors shown

## Still Not Working?

1. **Share terminal output** - Copy/paste any error messages
2. **Share browser console** - Press F12, copy errors
3. **Check:** Is the server actually running? Look for "Ready" message

## Expected Behavior

When working correctly:
- Terminal shows "✓ Ready"
- Browser loads login page or main page
- No critical errors in console (favicon 404 is OK)
- App is functional

The favicon error is cosmetic - your app should work despite it!

