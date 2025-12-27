export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  instrument: "violin";
  subscriptionTier: "free" | "paid";
  createdAt: Date;
}

export interface PracticeSession {
  id: string;
  userId: string;
  pieceId: string;
  pieceTitle: string;
  startedAt: Date;
  duration: number; // seconds
  accuracy: number; // 0-100
  feedback: NoteFeedback[];
}

export interface NoteFeedback {
  bar: number;
  noteIndex: number;
  expectedNote: string;
  playedNote?: string;
  accuracy: "correct" | "slightly_off" | "wrong";
  issues: string[]; // e.g., ["Rushed here", "Flat note"]
  timing: number; // milliseconds offset from expected
}

export interface MusicPiece {
  id: string;
  title: string;
  composer?: string;
  type: "public_domain" | "user_upload";
  fileUrl: string;
  thumbnailUrl?: string;
  // Structured notation data (Mode A - precise)
  notationData?: {
    timeSignature: { numerator: number; denominator: number }; // e.g., { numerator: 4, denominator: 4 }
    measures: Array<{
      measureNumber: number;
      systemIndex: number; // Which system (line) this measure appears on
      startBeat: number; // Beat position within the piece
      duration: number; // Duration in beats
    }>;
    totalBeats: number;
  };
}

export interface PracticeHistory {
  date: string;
  sessions: number;
  averageAccuracy: number;
  totalMinutes: number;
}

export interface UserProfile {
  user: User;
  streak: number;
  totalSessions: number;
  lastSession?: PracticeSession;
  practiceHistory: PracticeHistory[];
}

