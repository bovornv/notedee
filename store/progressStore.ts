import { create } from "zustand";
import { PracticeSession, NoteFeedback } from "@/types";

interface ProgressState {
  sessions: PracticeSession[];
  streak: number;
  lastPracticeDate: string | null; // YYYY-MM-DD format
  dailyGoal: {
    targetAccuracy: number;
    targetSessions: number;
  };
  practiceMode: "accuracy" | "rhythm" | "normal";
  feedbackMode: "calm" | "practice"; // Calm = minimal live feedback, Practice = limited real-time correctness
  
  addSession: (session: PracticeSession) => void;
  updateStreak: () => void;
  setDailyGoal: (accuracy: number, sessions: number) => void;
  setPracticeMode: (mode: "accuracy" | "rhythm" | "normal") => void;
  setFeedbackMode: (mode: "calm" | "practice") => void;
  getWeeklyStats: () => {
    sessions: number;
    averageAccuracy: number;
    totalMinutes: number;
  };
  getMostPracticedSong: () => string | null;
  getSkillBreakdown: () => {
    pitch: number;
    rhythm: number;
    tone: number;
    noteAccuracy: number;
  };
  getWeakSpots: () => Array<{
    issue: string;
    frequency: number;
    measures: number[];
  }>;
}

// Load from localStorage on init (only data, not functions)
const loadFromStorage = () => {
  if (typeof window === "undefined") {
    return {
      sessions: [],
      streak: 0,
      lastPracticeDate: null,
      dailyGoal: { targetAccuracy: 80, targetSessions: 1 },
      practiceMode: "normal" as const,
    };
  }
  try {
    const stored = localStorage.getItem("notedee-progress");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      const sessions = (parsed.sessions || []).map((s: any) => ({
        ...s,
        startedAt: new Date(s.startedAt),
      }));
      return {
        sessions,
        streak: parsed.streak || 0,
        lastPracticeDate: parsed.lastPracticeDate || null,
        dailyGoal: parsed.dailyGoal || { targetAccuracy: 80, targetSessions: 1 },
        practiceMode: parsed.practiceMode || "normal",
        feedbackMode: parsed.feedbackMode || "calm",
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {
    sessions: [],
    streak: 0,
    lastPracticeDate: null,
    dailyGoal: { targetAccuracy: 80, targetSessions: 1 },
    practiceMode: "normal" as const,
    feedbackMode: "calm" as const,
  };
};

// Save to localStorage (only data, not functions)
const saveToStorage = (state: ProgressState) => {
  if (typeof window === "undefined") return;
  try {
    const dataToSave = {
      sessions: state.sessions,
      streak: state.streak,
      lastPracticeDate: state.lastPracticeDate,
      dailyGoal: state.dailyGoal,
      practiceMode: state.practiceMode,
      feedbackMode: state.feedbackMode,
    };
    localStorage.setItem("notedee-progress", JSON.stringify(dataToSave));
  } catch {
    // Ignore storage errors
  }
};

const initialState = loadFromStorage();

export const useProgressStore = create<ProgressState>((set: any, get: any) => ({
      sessions: initialState.sessions,
      streak: initialState.streak,
      lastPracticeDate: initialState.lastPracticeDate,
      dailyGoal: initialState.dailyGoal,
      practiceMode: initialState.practiceMode,
      feedbackMode: initialState.feedbackMode,

      addSession: (session: PracticeSession) => {
        const state = get();
        const newSessions = [...state.sessions, session];
        const newState = { ...state, sessions: newSessions };
        set(newState);
        saveToStorage(newState);
        get().updateStreak();
      },

      updateStreak: () => {
        const state = get();
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        if (state.lastPracticeDate === today) {
          // Already practiced today, keep streak
          return;
        }

        let newStreak = state.streak;
        if (state.lastPracticeDate === yesterday) {
          // Continued streak
          newStreak = state.streak + 1;
        } else if (state.lastPracticeDate === null) {
          // First practice
          newStreak = 1;
        } else {
          // Streak broken
          newStreak = 1;
        }

        const newState = { ...state, streak: newStreak, lastPracticeDate: today };
        set(newState);
        saveToStorage(newState);
      },

      setDailyGoal: (accuracy: number, sessions: number) => {
        const newState = { ...get(), dailyGoal: { targetAccuracy: accuracy, targetSessions: sessions } };
        set(newState);
        saveToStorage(newState);
      },

      setPracticeMode: (mode: "accuracy" | "rhythm" | "normal") => {
        const newState = { ...get(), practiceMode: mode };
        set(newState);
        saveToStorage(newState);
      },

      setFeedbackMode: (mode: "calm" | "practice") => {
        const newState = { ...get(), feedbackMode: mode };
        set(newState);
        saveToStorage(newState);
      },

      getWeeklyStats: () => {
        const state = get();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekSessions = state.sessions.filter(
          (s: PracticeSession) => new Date(s.startedAt) >= weekAgo
        );

        const totalSessions = weekSessions.length;
        const averageAccuracy =
          weekSessions.length > 0
            ? weekSessions.reduce((sum: number, s: PracticeSession) => sum + s.accuracy, 0) /
              weekSessions.length
            : 0;
        const totalMinutes = weekSessions.reduce(
          (sum: number, s: PracticeSession) => sum + s.duration / 60,
          0
        );

        return {
          sessions: totalSessions,
          averageAccuracy,
          totalMinutes: Math.round(totalMinutes),
        };
      },

      getMostPracticedSong: () => {
        const state = get();
        const songCounts: { [key: string]: number } = {};
        state.sessions.forEach((s: PracticeSession) => {
          songCounts[s.pieceTitle] = (songCounts[s.pieceTitle] || 0) + 1;
        });

        const mostPracticed = Object.entries(songCounts).sort(
          (a, b) => b[1] - a[1]
        )[0];
        return mostPracticed ? mostPracticed[0] : null;
      },

      getSkillBreakdown: () => {
        const state = get();
        const recentSessions = state.sessions.slice(-10); // Last 10 sessions
        let pitchScore = 0;
        let rhythmScore = 0;
        let toneScore = 0;
        let noteAccuracy = 0;
        let totalNotes = 0;

        recentSessions.forEach((session: PracticeSession) => {
          session.feedback.forEach((note: NoteFeedback) => {
            totalNotes++;
            if (note.accuracy === "correct") noteAccuracy++;
            if (note.accuracy === "slightly_off") noteAccuracy += 0.5;

            // Pitch accuracy (intonation)
            if (note.issues.includes("Flat note") || note.issues.includes("Sharp note")) {
              // Deduct for pitch issues
            } else if (note.accuracy === "correct") {
              pitchScore++;
            } else if (note.accuracy === "slightly_off") {
              pitchScore += 0.5;
            }

            // Rhythm accuracy
            if (note.issues.includes("Late") || note.issues.includes("Early")) {
              // Deduct for timing issues
            } else if (Math.abs(note.timing) < 50) {
              rhythmScore++;
            } else if (Math.abs(note.timing) < 100) {
              rhythmScore += 0.5;
            }

            // Tone (bow control) - inferred from consistency
            // This is simplified - in production would analyze audio quality
            if (note.accuracy === "correct") {
              toneScore++;
            }
          });
        });

        const normalize = (score: number) =>
          totalNotes > 0 ? Math.round((score / totalNotes) * 100) : 0;

        return {
          pitch: normalize(pitchScore),
          rhythm: normalize(rhythmScore),
          tone: normalize(toneScore),
          noteAccuracy: normalize(noteAccuracy),
        };
      },

      getWeakSpots: () => {
        const state = get();
        const recentSessions = state.sessions.slice(-10);
        const issueCounts: { [key: string]: { count: number; measures: Set<number> } } = {};

        recentSessions.forEach((session: PracticeSession) => {
          session.feedback.forEach((note: NoteFeedback) => {
            note.issues.forEach((issue: string) => {
              if (!issueCounts[issue]) {
                issueCounts[issue] = { count: 0, measures: new Set() };
              }
              issueCounts[issue].count++;
              issueCounts[issue].measures.add(note.bar);
            });
          });
        });

        return Object.entries(issueCounts)
          .map(([issue, data]) => ({
            issue,
            frequency: data.count,
            measures: Array.from(data.measures),
          }))
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 5);
      },
    })
);

