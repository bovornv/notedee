import { MusicPiece } from "@/types";
import { MusicXMLNotation } from "@/types/musicxml";
import { loadPieceMusicXML } from "./musicxmlLoader";

/**
 * Extract expected notes from MusicXML (single source of truth)
 * Falls back to notationData or default notes if MusicXML not available
 */
export async function extractExpectedNotes(
  piece: MusicPiece | null,
  tempo: number,
  maxMeasures?: number
): Promise<Array<{ bar: number; noteIndex: number; note: string; time: number; pitch?: string; duration?: number; staffLine?: number }>> {
  if (!piece) {
    return getDefaultExpectedNotes(maxMeasures || 10);
  }

  // CRITICAL: MusicXML is the single source of truth
  // Try to load MusicXML first
  const musicXML = await loadPieceMusicXML(piece);
  if (musicXML) {
    return extractNotesFromMusicXML(musicXML, tempo, maxMeasures);
  }

  // Fallback: If piece has structured notation data, use it
  // (This is for backward compatibility or user uploads without MusicXML)
  if (piece.notationData) {
    return extractNotesFromNotationData(piece.notationData, tempo, maxMeasures);
  }

  // Final fallback: default notes (for user uploads without notation data)
  return getDefaultExpectedNotes(maxMeasures || 10);
}

/**
 * Extract notes from MusicXML (single source of truth)
 * This provides precise pitch, timing, and measure information
 */
function extractNotesFromMusicXML(
  musicXML: MusicXMLNotation,
  tempo: number,
  maxMeasures?: number
): Array<{ bar: number; noteIndex: number; note: string; time: number; pitch: string; duration: number; staffLine: number }> {
  const secondsPerBeat = 60 / tempo;
  const measuresToProcess = maxMeasures 
    ? musicXML.measures.slice(0, maxMeasures)
    : musicXML.measures;
  
  const expectedNotes: Array<{ bar: number; noteIndex: number; note: string; time: number; pitch: string; duration: number; staffLine: number }> = [];
  
  measuresToProcess.forEach((measure) => {
    // Sort notes by beat position within measure for correct indexing
    const sortedNotes = [...measure.notes].sort((a, b) => {
      const aBeatInMeasure = a.beatPosition - measure.startBeat;
      const bBeatInMeasure = b.beatPosition - measure.startBeat;
      return aBeatInMeasure - bBeatInMeasure;
    });
    
    sortedNotes.forEach((note, noteIndex) => {
      const timeInSeconds = note.beatPosition * secondsPerBeat;
      const durationInSeconds = note.duration * secondsPerBeat;
      
      expectedNotes.push({
        bar: measure.measureNumber,
        noteIndex, // Index within measure (sorted by beat position)
        note: note.pitch, // Use actual pitch from MusicXML (e.g., "C4", "A#5")
        time: timeInSeconds,
        pitch: note.pitch, // Explicit pitch field
        duration: durationInSeconds, // Duration in seconds
        staffLine: note.staffIndex, // Staff/system index for rendering
      });
    });
  });
  
  return expectedNotes;
}

/**
 * Extract notes from structured notation data
 * This assumes the notationData has measure information
 */
function extractNotesFromNotationData(
  notationData: NonNullable<MusicPiece["notationData"]>,
  tempo: number,
  maxMeasures?: number
): Array<{ bar: number; noteIndex: number; note: string; time: number }> {
  const { measures, timeSignature, totalBeats } = notationData;
  const secondsPerBeat = 60 / tempo;
  const beatsPerMeasure = timeSignature.numerator;
  const beatValue = timeSignature.denominator; // e.g., 4 for quarter note, 8 for eighth note
  
  const expectedNotes: Array<{ bar: number; noteIndex: number; note: string; time: number }> = [];
  const measuresToProcess = maxMeasures ? measures.slice(0, maxMeasures) : measures;

  // Determine note density based on time signature
  // Compound time signatures (6/8, 9/8, 12/8) have different feel than simple (4/4, 3/4)
  const isCompoundTime = beatValue === 8 && beatsPerMeasure % 3 === 0; // 6/8, 9/8, 12/8
  const isSimpleTime = beatValue === 4 || (beatValue === 2 && beatsPerMeasure <= 4); // 4/4, 3/4, 2/4, 2/2
  const isCutTime = beatValue === 2 && beatsPerMeasure === 2; // 2/2 (cut time)
  
  // Calculate subdivision based on time signature type
  let baseSubdivision: number;
  if (isCompoundTime) {
    // Compound time: 6/8 = 2 beats per measure (each beat = 3 eighth notes)
    // Generate notes at eighth-note level for compound time
    baseSubdivision = 0.125; // Eighth note subdivisions
  } else if (isCutTime) {
    // Cut time: 2/2 = 2 half notes per measure
    baseSubdivision = 0.5; // Half note subdivisions
  } else if (beatValue === 8) {
    // Other 8th-note time signatures (3/8, 5/8, 7/8)
    baseSubdivision = 0.25; // Eighth note subdivisions
  } else {
    // Simple time signatures (4/4, 3/4, 2/4)
    baseSubdivision = 0.5; // Quarter note subdivisions
  }

  // For each measure, generate expected notes based on beat positions
  measuresToProcess.forEach((measure) => {
    const measureNumber = measure.measureNumber;
    const measureStartBeat = measure.startBeat;
    const measureDuration = measure.duration;

    // Calculate notes per measure based on time signature
    // For compound time, we want more granular subdivisions
    let notesPerMeasure: number;
    if (isCompoundTime) {
      // 6/8: 6 eighth notes = 2 dotted quarter beats
      // Generate notes at eighth-note level
      notesPerMeasure = Math.max(4, Math.floor(beatsPerMeasure / baseSubdivision));
    } else if (isCutTime) {
      // 2/2: 2 half notes
      notesPerMeasure = Math.max(2, Math.floor(beatsPerMeasure / baseSubdivision));
    } else {
      // Standard: generate notes based on beat value
      notesPerMeasure = Math.max(2, Math.floor(beatsPerMeasure / baseSubdivision));
    }
    
    const beatInterval = measureDuration / notesPerMeasure;

    for (let i = 0; i < notesPerMeasure; i++) {
      const beatPosition = measureStartBeat + (i * beatInterval);
      const timeInSeconds = beatPosition * secondsPerBeat;

      // Generate a simple note pattern (in production, use actual notes from measure)
      // This is a placeholder - actual implementation would parse note data
      const noteIndex = i;
      const note = generateNoteForPosition(measureNumber, noteIndex, beatPosition);

      expectedNotes.push({
        bar: measureNumber,
        noteIndex,
        note,
        time: timeInSeconds,
      });
    }
  });

  return expectedNotes;
}

/**
 * Generate a note for a given position (placeholder - would use actual note data)
 * This creates a simple pattern for demonstration
 */
function generateNoteForPosition(
  measureNumber: number,
  noteIndex: number,
  beatPosition: number
): string {
  // Simple pattern based on measure and position
  // In production, this would come from actual sheet music parsing
  const notePatterns: { [key: number]: string[] } = {
    1: ["C4", "C4", "G4", "G4"],
    2: ["A4", "A4", "G4"],
    3: ["F4", "F4", "E4"],
    4: ["E4", "E4", "D4"],
  };

  const pattern = notePatterns[measureNumber] || ["C4", "D4", "E4", "F4"];
  return pattern[noteIndex % pattern.length] || "C4";
}

/**
 * Default expected notes for pieces without notation data
 * Uses a simple Twinkle Twinkle Little Star pattern
 */
function getDefaultExpectedNotes(
  maxMeasures: number
): Array<{ bar: number; noteIndex: number; note: string; time: number }> {
  const defaultPattern = [
    { bar: 1, notes: ["C4", "C4", "G4", "G4"], times: [0.5, 1.0, 1.5, 2.0] },
    { bar: 2, notes: ["A4", "A4", "G4"], times: [2.5, 3.0, 3.5] },
    { bar: 3, notes: ["F4", "F4", "E4"], times: [4.0, 4.5, 5.0] },
    { bar: 4, notes: ["E4", "E4", "D4"], times: [5.5, 6.0, 6.5] },
    { bar: 5, notes: ["D4", "D4", "C4"], times: [7.0, 7.5, 8.0] },
  ];

  const expectedNotes: Array<{ bar: number; noteIndex: number; note: string; time: number }> = [];

  for (let i = 0; i < Math.min(maxMeasures, defaultPattern.length); i++) {
    const measure = defaultPattern[i];
    measure.notes.forEach((note, noteIndex) => {
      expectedNotes.push({
        bar: measure.bar,
        noteIndex,
        note,
        time: measure.times[noteIndex],
      });
    });
  }

  return expectedNotes;
}

/**
 * Calculate measure boundaries from notation data
 * Returns an array of { measureNumber, startTime, endTime }
 */
export function calculateMeasureBoundaries(
  notationData: NonNullable<MusicPiece["notationData"]>,
  tempo: number
): Array<{ measureNumber: number; startTime: number; endTime: number }> {
  const { measures } = notationData;
  const secondsPerBeat = 60 / tempo;

  return measures.map((measure) => {
    const startTime = measure.startBeat * secondsPerBeat;
    const endTime = (measure.startBeat + measure.duration) * secondsPerBeat;

    return {
      measureNumber: measure.measureNumber,
      startTime,
      endTime,
    };
  });
}

