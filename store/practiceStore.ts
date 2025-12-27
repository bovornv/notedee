import { create } from "zustand";
import { MusicPiece, PracticeSession, NoteFeedback } from "@/types";

interface PracticeState {
  selectedPiece: MusicPiece | null;
  isRecording: boolean;
  recordedAudio: Blob | null;
  analysisCompleted: boolean; // Step 2 is complete only after analysis
  currentSession: PracticeSession | null;
  feedback: NoteFeedback[];
  metronomeEnabled: boolean;
  tempo: number; // BPM
  timeSignature: { numerator: number; denominator: number }; // e.g., { numerator: 4, denominator: 4 }
  micPermissionDenied: boolean;
  countdown: number | null;
  setSelectedPiece: (piece: MusicPiece | null) => void;
  setIsRecording: (recording: boolean) => void;
  setRecordedAudio: (audio: Blob | null) => void;
  setAnalysisCompleted: (completed: boolean) => void;
  setCurrentSession: (session: PracticeSession | null) => void;
  setFeedback: (feedback: NoteFeedback[]) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setTempo: (tempo: number) => void;
  setTimeSignature: (timeSignature: { numerator: number; denominator: number }) => void;
  setMicPermissionDenied: (denied: boolean) => void;
  setCountdown: (countdown: number | null) => void;
  reset: () => void;
  resetSteps2And3: () => void; // Reset when music changes
}

export const usePracticeStore = create<PracticeState>((set) => ({
  selectedPiece: null,
  isRecording: false,
  recordedAudio: null,
  analysisCompleted: false,
  currentSession: null,
  feedback: [],
  metronomeEnabled: false,
  tempo: 120,
  timeSignature: { numerator: 4, denominator: 4 }, // Default 4/4 time
  micPermissionDenied: false,
  countdown: null,
  setSelectedPiece: (piece) => {
    set({ selectedPiece: piece });
    // If changing music, reset steps 2 and 3
    if (piece === null) {
      set({
        recordedAudio: null,
        analysisCompleted: false,
        feedback: [],
        isRecording: false,
      });
    }
  },
  setIsRecording: (recording) => set({ isRecording: recording }),
  setRecordedAudio: (audio) => set({ recordedAudio: audio }),
  setAnalysisCompleted: (completed) => set({ analysisCompleted: completed }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setFeedback: (feedback) => set({ feedback }),
  setMetronomeEnabled: (enabled) => set({ metronomeEnabled: enabled }),
  setTempo: (tempo) => set({ tempo }),
  setTimeSignature: (timeSignature) => set({ timeSignature }),
  setMicPermissionDenied: (denied) => set({ micPermissionDenied: denied }),
  setCountdown: (countdown) => set({ countdown }),
  reset: () =>
    set({
      selectedPiece: null,
      isRecording: false,
      recordedAudio: null,
      analysisCompleted: false,
      currentSession: null,
      feedback: [],
      metronomeEnabled: false,
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      micPermissionDenied: false,
      countdown: null,
    }),
  resetSteps2And3: () =>
    set({
      recordedAudio: null,
      analysisCompleted: false,
      feedback: [],
      isRecording: false,
    }),
}));
