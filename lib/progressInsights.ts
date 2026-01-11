import { PracticeSession, NoteFeedback } from "@/types";

export interface ImprovementHighlight {
  text: string;
  type: "positive" | "neutral";
  change: number;
}

export interface PracticeRecommendation {
  suggestedSong: string;
  suggestedTempo: number;
  suggestedFocus: string;
  suggestedDuration: number; // minutes
}

/**
 * Calculate improvement highlights comparing this week vs last week
 */
export function getImprovementHighlights(
  sessions: PracticeSession[]
): ImprovementHighlight[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = sessions.filter((s) => new Date(s.startedAt) >= weekAgo);
  const lastWeek = sessions.filter(
    (s) =>
      new Date(s.startedAt) >= twoWeeksAgo &&
      new Date(s.startedAt) < weekAgo
  );

  const thisWeekAccuracy =
    thisWeek.length > 0
      ? thisWeek.reduce((sum, s) => sum + s.accuracy, 0) / thisWeek.length
      : 0;
  const lastWeekAccuracy =
    lastWeek.length > 0
      ? lastWeek.reduce((sum, s) => sum + s.accuracy, 0) / lastWeek.length
      : 0;

  const highlights: ImprovementHighlight[] = [];

  // Accuracy improvement
  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const accuracyChange = thisWeekAccuracy - lastWeekAccuracy;
    if (Math.abs(accuracyChange) > 2) {
      highlights.push({
        text: `Accuracy ${accuracyChange > 0 ? "improved" : "decreased"} ${Math.abs(accuracyChange).toFixed(0)}% this week`,
        type: accuracyChange > 0 ? "positive" : "neutral",
        change: accuracyChange,
      });
    }
  }

  // Rhythm analysis
  const thisWeekRhythm = calculateRhythmScore(thisWeek);
  const lastWeekRhythm = calculateRhythmScore(lastWeek);
  if (thisWeekRhythm > 0 && lastWeekRhythm > 0) {
    const rhythmChange = thisWeekRhythm - lastWeekRhythm;
    if (Math.abs(rhythmChange) > 3) {
      highlights.push({
        text: `Rhythm ${rhythmChange > 0 ? "improved" : "needs work"} ${Math.abs(rhythmChange).toFixed(0)}% this week`,
        type: rhythmChange > 0 ? "positive" : "neutral",
        change: rhythmChange,
      });
    }
  }

  // Practice consistency
  if (thisWeek.length > lastWeek.length) {
    highlights.push({
      text: `Practiced ${thisWeek.length - lastWeek.length} more time${thisWeek.length - lastWeek.length > 1 ? "s" : ""} this week`,
      type: "positive",
      change: thisWeek.length - lastWeek.length,
    });
  }

  return highlights.slice(0, 3); // Max 3 highlights
}

/**
 * Calculate rhythm score from sessions
 */
function calculateRhythmScore(sessions: PracticeSession[]): number {
  let totalNotes = 0;
  let onTimeNotes = 0;

  sessions.forEach((session) => {
    session.feedback.forEach((note) => {
      totalNotes++;
      if (Math.abs(note.timing) < 100) {
        onTimeNotes++;
      }
    });
  });

  return totalNotes > 0 ? (onTimeNotes / totalNotes) * 100 : 0;
}

/**
 * Get one strength and one weakness for the week
 */
export function getWeeklyStrengthsAndWeaknesses(
  sessions: PracticeSession[]
): { strength: string; weakness: string } {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekSessions = sessions.filter((s) => new Date(s.startedAt) >= weekAgo);

  if (weekSessions.length === 0) {
    return {
      strength: "Keep practicing to discover your strengths!",
      weakness: "Start practicing to identify areas for improvement",
    };
  }

  const skillBreakdown = calculateSkillBreakdown(weekSessions);
  const strengths = Object.entries(skillBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1);

  const weaknesses = Object.entries(skillBreakdown)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 1);

  const strengthLabels: { [key: string]: string } = {
    pitch: "Pitch accuracy",
    rhythm: "Rhythm and timing",
    tone: "Tone quality",
    noteAccuracy: "Note accuracy",
  };

  const weaknessLabels: { [key: string]: string } = {
    pitch: "Pitch accuracy",
    rhythm: "Rhythm and timing",
    tone: "Tone quality",
    noteAccuracy: "Note accuracy",
  };

  return {
    strength: strengthLabels[strengths[0]?.[0]] || "Overall consistency",
    weakness: weaknessLabels[weaknesses[0]?.[0]] || "General technique",
  };
}

function calculateSkillBreakdown(sessions: PracticeSession[]) {
  let pitchScore = 0;
  let rhythmScore = 0;
  let toneScore = 0;
  let noteAccuracy = 0;
  let totalNotes = 0;

  sessions.forEach((session) => {
    session.feedback.forEach((note) => {
      totalNotes++;
      if (note.accuracy === "correct") noteAccuracy++;
      if (note.accuracy === "slightly_off") noteAccuracy += 0.5;

      if (!note.issues.some((i) => i.includes("Flat") || i.includes("Sharp"))) {
        if (note.accuracy === "correct") pitchScore++;
        else if (note.accuracy === "slightly_off") pitchScore += 0.5;
      }

      if (Math.abs(note.timing) < 100) {
        rhythmScore++;
      } else if (Math.abs(note.timing) < 200) {
        rhythmScore += 0.5;
      }

      if (note.accuracy === "correct") {
        toneScore++;
      }
    });
  });

  const normalize = (score: number) =>
    totalNotes > 0 ? (score / totalNotes) * 100 : 0;

  return {
    pitch: normalize(pitchScore),
    rhythm: normalize(rhythmScore),
    tone: normalize(toneScore),
    noteAccuracy: normalize(noteAccuracy),
  };
}

/**
 * Generate personalized practice recommendations
 */
export function getPracticeRecommendations(
  sessions: PracticeSession[],
  mostPracticedSong: string | null,
  weakSpots: Array<{ issue: string; frequency: number; measures: number[] }>
): PracticeRecommendation {
  const recentSessions = sessions.slice(-5);
  const avgAccuracy =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) /
        recentSessions.length
      : 0;

  // Suggest song based on difficulty progression
  let suggestedSong = "Mary Had a Little Lamb";
  if (avgAccuracy >= 90) {
    suggestedSong = "Minuet in G";
  } else if (avgAccuracy >= 80) {
    suggestedSong = "Ode to Joy";
  } else if (avgAccuracy >= 70) {
    suggestedSong = "Lightly Row";
  }

  // Suggest tempo based on recent performance
  let suggestedTempo = 120;
  if (avgAccuracy < 70) {
    suggestedTempo = 90; // Slower for struggling students
  } else if (avgAccuracy >= 85) {
    suggestedTempo = 140; // Faster for advanced students
  }

  // Suggest focus based on weak spots
  let suggestedFocus = "Overall technique";
  if (weakSpots.length > 0) {
    const topIssue = weakSpots[0].issue.toLowerCase();
    if (topIssue.includes("rhythm") || topIssue.includes("timing")) {
      suggestedFocus = "Rhythm and timing";
    } else if (topIssue.includes("flat") || topIssue.includes("sharp")) {
      suggestedFocus = "Pitch accuracy and intonation";
    } else if (topIssue.includes("rushing")) {
      suggestedFocus = "Steady tempo";
    } else {
      suggestedFocus = topIssue;
    }
  }

  // Suggest duration
  const suggestedDuration = avgAccuracy < 70 ? 20 : 15; // Longer for struggling students

  return {
    suggestedSong,
    suggestedTempo,
    suggestedFocus,
    suggestedDuration,
  };
}

/**
 * Generate personalized feedback sentence after practice
 */
export function getPostSessionFeedback(
  accuracy: number,
  feedback: NoteFeedback[]
): string {
  const correctCount = feedback.filter((f) => f.accuracy === "correct").length;
  const totalCount = feedback.length;
  const correctRatio = totalCount > 0 ? correctCount / totalCount : 0;

  // Teacher-like, encouraging feedback
  if (accuracy >= 90) {
    return "Excellent work! Your playing is very accurate. Keep up the great practice!";
  } else if (accuracy >= 80) {
    return "Great job! You're making steady progress. Focus on those tricky sections and you'll master them soon.";
  } else if (accuracy >= 70) {
    return "Good effort! Practice slowly and focus on accuracy over speed. You're on the right track.";
  } else if (accuracy >= 60) {
    return "Keep practicing! Try slowing down the tempo and focusing on one section at a time. Every practice session helps.";
  } else {
    return "Don't give up! Start with a slower tempo and focus on getting each note right. Take your time—you're learning.";
  }
}

