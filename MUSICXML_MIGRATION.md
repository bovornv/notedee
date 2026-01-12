# MusicXML Migration Status

## Overview
Redesigning Notedee so MusicXML (or structured JSON) is the single source of truth for analysis, while PDF is used only for display or fallback.

## Completed ✅

1. **MusicXML Types** (`types/musicxml.ts`)
   - Created comprehensive types for MusicXML notation
   - Includes note-level data: pitch, duration, beat position, measure index, staff position
   - Includes rendered note types with bounding boxes

2. **MusicXML Parser** (`lib/musicxmlParser.ts`)
   - Parses MusicXML files
   - Extracts all timing, pitch, and layout information
   - Converts to internal notation format

3. **MusicXML Loader** (`lib/musicxmlLoader.ts`)
   - Loads MusicXML files for pieces
   - Provides helper functions to check MusicXML support
   - Converts MusicXML to notationData format

4. **Updated Types** (`types/index.ts`)
   - Added `musicXMLUrl` field to `MusicPiece`
   - MusicXML is now the primary data source

5. **Updated Starter Library** (`lib/starterLibrary.ts`)
   - Added MusicXML URLs for all starter songs
   - MusicXML files expected in `/public/musicxml/`

6. **Updated Notation Parser** (`lib/notationParser.ts`)
   - Now loads MusicXML first (single source of truth)
   - Falls back to notationData or defaults if MusicXML unavailable
   - Extracts precise pitch and timing from MusicXML

7. **Updated Practice Page** (`app/practice/page.tsx`)
   - Loads expected notes from MusicXML asynchronously
   - Uses MusicXML data for measure analysis

8. **Updated SheetMusicViewer** (`components/SheetMusicViewer.tsx`)
   - Loads expected notes from MusicXML asynchronously

## In Progress 🚧

1. **MusicXML Renderer**
   - Need to create SVG/canvas renderer from MusicXML
   - Track note bounding boxes for ticker alignment
   - Currently using PDF for display (temporary)

2. **Ticker Note-by-Note Movement**
   - Update ticker to move based on MusicXML note positions
   - Align ticker to actual note bounding boxes
   - Move note-by-note, not pixel-by-pixel

3. **Auto-Scroll with MusicXML Systems**
   - Use MusicXML system boundaries for scrolling
   - Scroll only when final note of system completes

4. **Feedback Against MusicXML**
   - Compare performance against MusicXML timing + pitch
   - Apply feedback per note based on MusicXML data

5. **PDF Fallback UX**
   - Show appropriate messages when MusicXML unavailable
   - Distinguish "Playable & analyzable" vs "View-only" scores

## Next Steps

1. Create `/public/musicxml/` directory and add MusicXML files for starter songs
2. Implement MusicXML renderer (or use existing PDF renderer with MusicXML positioning)
3. Update ticker to use MusicXML note positions
4. Update auto-scroll to use MusicXML system boundaries
5. Update feedback to compare against MusicXML data
6. Add UX messages for PDF-only pieces

## File Structure

```
/public/
  /musicxml/          # MusicXML files (to be added)
    mary-had-a-little-lamb.xml
    hot-cross-buns.xml
    ...
  /sheet-music/       # PDF files (display only)
    mary-had-a-little-lamb.pdf
    ...
```

## Notes

- MusicXML parser handles basic MusicXML structure
- For production, may need more robust MusicXML library (e.g., musicxml-interfaces)
- PDF rendering can continue to be used for display while MusicXML drives analysis
- Ticker alignment to note bounding boxes requires rendered note positions
