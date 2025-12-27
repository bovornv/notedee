# Quick Fix Instructions

If you're seeing 404 errors for layout.css, app-pages-internals.js, main-app.js:

1. **Stop the dev server** (Ctrl+C in terminal)

2. **Clean build cache:**
   ```bash
   rm -rf .next
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Wait for compilation** - You should see:
   ```
   ▲ Next.js 14.2.5
   - Local:        http://localhost:3000
   ✓ Ready in X seconds
   ```

5. **Hard refresh browser:**
   - Mac: Cmd+Shift+R
   - Windows: Ctrl+Shift+R

If still not working, check terminal for compilation errors.

