/**
 * MusicXML-based notation data structure
 * This is the single source of truth for all timing, pitch, and layout information
 */

export interface MusicXMLNote {
  id: string; // Unique identifier for this note
  pitch: string; // Scientific pitch notation (e.g., "C4", "A#5")
  midiNumber: number; // MIDI note number (0-127)
  duration: number; // Duration in beats (e.g., 0.5 for eighth note, 1.0 for quarter note)
  beatPosition: number; // Beat position within the piece (0-indexed)
  measureIndex: number; // Measure number (1-indexed)
  staffIndex: number; // Staff/system index (0-indexed)
  voice: number; // Voice number (for polyphonic music)
  stemDirection?: "up" | "down"; // Stem direction
  accidental?: "sharp" | "flat" | "natural" | "double-sharp" | "double-flat";
  tie?: "start" | "stop" | "continue"; // Tie information
  slur?: "start" | "stop"; // Slur information
}

export interface MusicXMLMeasure {
  measureNumber: number; // Measure number (1-indexed)
  systemIndex: number; // Which system/staff line this measure appears on
  startBeat: number; // Beat position where measure starts
  duration: number; // Duration in beats
  timeSignature: { numerator: number; denominator: number };
  keySignature?: { fifths: number; mode?: "major" | "minor" };
  notes: MusicXMLNote[]; // All notes in this measure
}

export interface MusicXMLSystem {
  systemIndex: number; // System/staff line index (0-indexed)
  measures: number[]; // Measure numbers in this system
  startBeat: number; // First beat of first measure in system
  endBeat: number; // Last beat of last measure in system
}

export interface MusicXMLNotation {
  title: string;
  composer?: string;
  timeSignature: { numerator: number; denominator: number };
  keySignature?: { fifths: number; mode?: "major" | "minor" };
  tempo: number; // Default tempo (BPM)
  measures: MusicXMLMeasure[];
  systems: MusicXMLSystem[];
  notes: MusicXMLNote[]; // Flat list of all notes for easy lookup
  totalBeats: number;
}

/**
 * Rendered note with bounding box information
 * Used for ticker alignment and visual feedback
 */
export interface RenderedNote {
  noteId: string; // Reference to MusicXMLNote.id
  x: number; // Left edge of note bounding box
  y: number; // Top edge of note bounding box
  width: number; // Width of note bounding box
  height: number; // Height of note bounding box
  centerX: number; // Center X position (for ticker alignment)
  centerY: number; // Center Y position (staff line)
  systemIndex: number; // Which system this note is rendered in
}
