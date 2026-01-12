# MusicXML Files

This directory contains MusicXML files for starter songs. These files are the **single source of truth** for all timing, pitch, and layout information.

## Files

- `mary-had-a-little-lamb.xml`
- `hot-cross-buns.xml`
- `twinkle-twinkle-little-star.xml`
- `lightly-row.xml` (to be added)
- `go-tell-aunt-rhody.xml` (to be added)
- `ode-to-joy.xml` (to be added)
- `long-long-ago.xml` (to be added)
- `minuet-in-g.xml` (to be added)
- `allegretto.xml` (to be added)
- `song-of-the-wind.xml` (to be added)

## Usage

MusicXML files are automatically loaded when a piece is selected. The app uses MusicXML for:
- Ticker movement (note-by-note)
- Metronome synchronization
- Auto-scroll timing
- Pitch and timing analysis
- Visual feedback

PDF files in `/sheet-music/` are used **only for display** and as a fallback when MusicXML is unavailable.
