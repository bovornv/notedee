import { MusicXMLNotation, MusicXMLNote, RenderedNote } from "@/types/musicxml";

/**
 * Render MusicXML notation to canvas with note bounding box tracking
 * This enables precise ticker alignment to actual note positions
 */
export interface RenderOptions {
  width: number;
  height: number;
  scale?: number;
  staffSpacing?: number; // Vertical spacing between staff lines
  noteSpacing?: number; // Horizontal spacing between notes
}

/**
 * Calculate note bounding boxes for ticker alignment
 * Returns a map of note IDs to their rendered positions
 * This accounts for actual PDF layout and MusicXML timing
 */
export function calculateNoteBoundingBoxes(
  musicXML: MusicXMLNotation,
  options: RenderOptions,
  musicFrame?: { left: number; right: number; top: number; bottom: number }
): Map<string, RenderedNote> {
  const {
    width,
    height,
    scale = 1.0,
    staffSpacing = 100,
    noteSpacing = 50,
  } = options;

  const renderedNotes = new Map<string, RenderedNote>();
  const marginLeft = width * 0.12;
  const marginRight = width * 0.08;
  const marginTop = height * 0.08;
  const musicWidth = width - marginLeft - marginRight;
  
  // Group notes by system
  const notesBySystem = new Map<number, MusicXMLNote[]>();
  musicXML.notes.forEach((note) => {
    if (!notesBySystem.has(note.staffIndex)) {
      notesBySystem.set(note.staffIndex, []);
    }
    notesBySystem.get(note.staffIndex)!.push(note);
  });
  
  // Calculate positions for each system
  notesBySystem.forEach((systemNotes, systemIndex) => {
    // Calculate system Y position
    const systemHeight = staffSpacing * 0.8; // Staff height within system
    const systemY = musicFrame
      ? musicFrame.top + (systemIndex * (musicFrame.bottom - musicFrame.top) / notesBySystem.size)
      : marginTop + (systemIndex * staffSpacing);
    
    // Sort notes by beat position
    systemNotes.sort((a, b) => a.beatPosition - b.beatPosition);
    
    // Find system boundaries from MusicXML systems
    const system = musicXML.systems.find(s => s.systemIndex === systemIndex);
    const systemStartBeat = system?.startBeat ?? Math.min(...systemNotes.map(n => n.beatPosition));
    const systemEndBeat = system?.endBeat ?? Math.max(...systemNotes.map(n => n.beatPosition + n.duration));
    const systemDuration = systemEndBeat - systemStartBeat;
    
    // Calculate total beats across all systems for proportional spacing
    const totalBeats = musicXML.totalBeats || systemDuration;
    
    systemNotes.forEach((note) => {
      // Calculate X position based on beat position within entire piece
      // This ensures consistent positioning across systems
      const beatProgress = totalBeats > 0
        ? note.beatPosition / totalBeats
        : (note.beatPosition - systemStartBeat) / systemDuration;
      
      // Use system-local progress if totalBeats not available
      const noteX = marginLeft + (beatProgress * musicWidth);
      
      // Calculate note width based on duration
      const durationProgress = totalBeats > 0
        ? note.duration / totalBeats
        : note.duration / systemDuration;
      const noteWidth = Math.max(durationProgress * musicWidth, 12 * (options.scale || 1.0)); // Minimum width scales with zoom
      
      const noteHeight = systemHeight * 0.25 * (options.scale || 1.0); // Note head height scales with zoom
      const centerY = systemY + (systemHeight / 2);
      
      const renderedNote: RenderedNote = {
        noteId: note.id,
        x: noteX - noteWidth / 2,
        y: centerY - noteHeight / 2,
        width: noteWidth,
        height: noteHeight,
        centerX: noteX,
        centerY,
        systemIndex: note.staffIndex,
      };
      
      renderedNotes.set(note.id, renderedNote);
    });
  });
  
  return renderedNotes;
}

/**
 * Render MusicXML to canvas context
 * This is a simplified renderer - in production, use a full MusicXML rendering library
 */
export function renderMusicXMLToCanvas(
  context: CanvasRenderingContext2D,
  musicXML: MusicXMLNotation,
  options: RenderOptions
): Map<string, RenderedNote> {
  const {
    width,
    height,
    scale = 1.0,
    staffSpacing = 100,
  } = options;

  // Clear canvas
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  
  // Calculate note bounding boxes
  const renderedNotes = calculateNoteBoundingBoxes(musicXML, options);
  
  // Draw staff lines
  const marginTop = height * 0.08;
  const systems = musicXML.systems.length;
  
  for (let i = 0; i < systems; i++) {
    const systemY = marginTop + (i * staffSpacing);
    const staffHeight = staffSpacing * 0.8;
    
    // Draw 5 staff lines
    context.strokeStyle = "#000000";
    context.lineWidth = 1;
    for (let line = 0; line < 5; line++) {
      const lineY = systemY + (line * staffHeight / 4);
      context.beginPath();
      context.moveTo(width * 0.12, lineY);
      context.lineTo(width * 0.92, lineY);
      context.stroke();
    }
    
    // Draw notes as circles (simplified)
    renderedNotes.forEach((renderedNote) => {
      if (renderedNote.systemIndex === i) {
        context.fillStyle = "#000000";
        context.beginPath();
        context.arc(
          renderedNote.centerX,
          renderedNote.centerY,
          renderedNote.height / 2,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    });
  }
  
  return renderedNotes;
}
