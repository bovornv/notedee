import { MusicPiece } from "@/types";

/**
 * Extract expected notes from notation data for audio analysis
 * This is a simplified parser - in production, this would integrate with
 * actual sheet music parsing libraries (e.g., MusicXML, MIDI, or OCR)
 */
export function extractExpectedNotes(
  piece: MusicPiece | null,
  tempo: number,
  maxMeasures?: number
): Array<{ bar: number; noteIndex: number; note: string; time: number }> {
  if (!piece) {
    return getDefaultExpectedNotes(maxMeasures || 10);
  }

  // If piece has structured notation data, use it
  if (piece.notationData) {
    return extractNotesFromNotationData(piece.notationData, tempo, maxMeasures);
  }

  // Fallback to default notes (for user uploads without notation data)
  return getDefaultExpectedNotes(maxMeasures || 10);
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

  // For each measure, generate expected notes based on beat positions
  measuresToProcess.forEach((measure) => {
    const measureNumber = measure.measureNumber;
    const measureStartBeat = measure.startBeat;
    const measureDuration = measure.duration;

    // Generate notes at regular intervals within the measure
    // Adjust note density based on time signature (e.g., 6/8 has more subdivisions)
    // In production, this would come from actual note data in the measure
    const baseSubdivision = beatValue === 8 ? 0.25 : 0.5; // More notes for 8th-note time signatures
    const notesPerMeasure = Math.max(2, Math.floor(beatsPerMeasure / baseSubdivision));
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

