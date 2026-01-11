import * as PitchFinder from "pitchfinder";
import { NoteFeedback } from "@/types";

const detectPitch = PitchFinder.YIN({ sampleRate: 44100 });

export interface AudioAnalysisResult {
  feedback: NoteFeedback[];
  overallAccuracy: number;
  mainIssues: string[];
}

// Extended note frequency mapping (violin range)
const NOTE_FREQUENCIES: { [note: string]: number } = {
  G3: 196.0,
  "G#3": 207.65,
  A3: 220.0,
  "A#3": 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
  C6: 1046.5,
};

function frequencyToNote(freq: number): string {
  let closestNote = "A4";
  let minDiff = Infinity;

  for (const [note, noteFreq] of Object.entries(NOTE_FREQUENCIES)) {
    const diff = Math.abs(freq - noteFreq);
    if (diff < minDiff) {
      minDiff = diff;
      closestNote = note;
    }
  }

  return closestNote;
}

function getNoteAccuracy(
  expectedFreq: number,
  playedFreq: number
): "correct" | "slightly_off" | "wrong" {
  const diff = Math.abs(playedFreq - expectedFreq);
  const percentDiff = diff / expectedFreq;

  if (percentDiff < 0.02) return "correct"; // Within 2%
  if (percentDiff < 0.05) return "slightly_off"; // Within 5%
  return "wrong";
}

function calculateTimingOffset(
  expectedTime: number,
  detectedTime: number
): number {
  return (detectedTime - expectedTime) * 1000; // Convert to milliseconds
}

export async function analyzeAudio(
  audioBuffer: AudioBuffer,
  expectedNotes: Array<{ bar: number; noteIndex: number; note: string; time: number }>
): Promise<AudioAnalysisResult> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  const hopSize = 512;

  const feedback: NoteFeedback[] = [];
  let correctCount = 0;
  let totalCount = 0;
  const issues: string[] = [];

  // Analyze each expected note
  for (const expected of expectedNotes) {
    const startSample = Math.floor(expected.time * sampleRate);
    const endSample = Math.min(
      startSample + frameSize,
      channelData.length
    );

    if (startSample >= channelData.length) {
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    const segment = channelData.slice(startSample, endSample);

    // Ensure segment has enough samples
    if (segment.length < 512) {
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    let detectedFreq: number | null = null;
    try {
      detectedFreq = detectPitch(segment);
    } catch (error) {
      console.error("Pitch detection error:", error);
    }

    if (!detectedFreq || detectedFreq < 100 || detectedFreq > 2000) {
      // No pitch detected or out of range
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    const expectedFreq = NOTE_FREQUENCIES[expected.note] || 440;
    const accuracy = getNoteAccuracy(expectedFreq, detectedFreq);
    const playedNote = frequencyToNote(detectedFreq);

    const noteIssues: string[] = [];
    if (accuracy === "wrong") {
      if (detectedFreq < expectedFreq * 0.95) {
        noteIssues.push("Flat note");
        if (!issues.includes("Flat notes")) issues.push("Flat notes");
      } else if (detectedFreq > expectedFreq * 1.05) {
        noteIssues.push("Sharp note");
        if (!issues.includes("Sharp notes")) issues.push("Sharp notes");
      } else {
        noteIssues.push("Wrong note");
      }
    } else if (accuracy === "slightly_off") {
      if (detectedFreq < expectedFreq) {
        noteIssues.push("Slightly flat");
      } else {
        noteIssues.push("Slightly sharp");
      }
    }

    // Timing analysis
    const detectedTime = startSample / sampleRate;
    const timing = calculateTimingOffset(expected.time, detectedTime);
    
    if (Math.abs(timing) > 100) {
      if (timing > 0) {
        noteIssues.push("Late");
        if (!issues.includes("Rushing")) issues.push("Rushing");
      } else {
        noteIssues.push("Early");
        if (!issues.includes("Rushing")) issues.push("Rushing");
      }
    }

    feedback.push({
      bar: expected.bar,
      noteIndex: expected.noteIndex,
      expectedNote: expected.note,
      playedNote,
      accuracy,
      issues: noteIssues,
      timing,
    });

    if (accuracy === "correct") correctCount++;
    totalCount++;
  }

  const overallAccuracy =
    totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  // Determine main issue
  const mainIssues: string[] = [];
  if (issues.length > 0) {
    mainIssues.push(`Main issue: ${issues[0]}`);
  }
  if (overallAccuracy < 50) {
    mainIssues.push("Low accuracy - practice slowly");
  }

  return { feedback, overallAccuracy, mainIssues };
}

// Analyze a single measure's audio (for delayed measure-level feedback)
export async function analyzeMeasure(
  audioBuffer: AudioBuffer,
  measureNumber: number,
  measureStartTime: number,
  measureDuration: number,
  expectedNotes: Array<{ bar: number; noteIndex: number; note: string; time: number }>
): Promise<{ feedback: NoteFeedback[]; measureAccuracy: number } | null> {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const frameSize = 2048;
  
  // Filter expected notes for this measure
  const measureNotes = expectedNotes.filter(
    (note) => note.bar === measureNumber && note.time >= measureStartTime && note.time < measureStartTime + measureDuration
  );

  if (measureNotes.length === 0) {
    // No expected notes for this measure - return neutral feedback
    return {
      feedback: [],
      measureAccuracy: 0,
    };
  }

  const feedback: NoteFeedback[] = [];
  let correctCount = 0;
  let totalCount = 0;

  // Analyze each note in the measure
  for (const expected of measureNotes) {
    // Adjust time relative to measure start
    const relativeTime = expected.time - measureStartTime;
    const startSample = Math.floor(relativeTime * sampleRate);
    const endSample = Math.min(startSample + frameSize, channelData.length);

    if (startSample >= channelData.length) {
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    const segment = channelData.slice(startSample, endSample);

    if (segment.length < 512) {
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    let detectedFreq: number | null = null;
    try {
      detectedFreq = detectPitch(segment);
    } catch (error) {
      console.error("Pitch detection error:", error);
    }

    if (!detectedFreq || detectedFreq < 100 || detectedFreq > 2000) {
      feedback.push({
        bar: expected.bar,
        noteIndex: expected.noteIndex,
        expectedNote: expected.note,
        accuracy: "wrong",
        issues: ["Missed entry"],
        timing: 0,
      });
      totalCount++;
      continue;
    }

    const expectedFreq = NOTE_FREQUENCIES[expected.note] || 440;
    const accuracy = getNoteAccuracy(expectedFreq, detectedFreq);
    const playedNote = frequencyToNote(detectedFreq);

    const noteIssues: string[] = [];
    if (accuracy === "wrong") {
      if (detectedFreq < expectedFreq * 0.95) {
        noteIssues.push("Flat note");
      } else if (detectedFreq > expectedFreq * 1.05) {
        noteIssues.push("Sharp note");
      } else {
        noteIssues.push("Wrong note");
      }
    } else if (accuracy === "slightly_off") {
      if (detectedFreq < expectedFreq) {
        noteIssues.push("Slightly flat");
      } else {
        noteIssues.push("Slightly sharp");
      }
    }

    const detectedTime = startSample / sampleRate;
    const timing = calculateTimingOffset(relativeTime, detectedTime);

    if (Math.abs(timing) > 100) {
      if (timing > 0) {
        noteIssues.push("Late");
      } else {
        noteIssues.push("Early");
      }
    }

    feedback.push({
      bar: expected.bar,
      noteIndex: expected.noteIndex,
      expectedNote: expected.note,
      playedNote,
      accuracy,
      issues: noteIssues,
      timing,
    });

    if (accuracy === "correct") correctCount++;
    totalCount++;
  }

  const measureAccuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  return { feedback, measureAccuracy };
}
