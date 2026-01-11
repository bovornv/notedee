"use client";

import { Lightbulb } from "lucide-react";

interface PracticeTipsProps {
  accuracy: number;
  mainIssues: string[];
}

export default function PracticeTips({ accuracy, mainIssues }: PracticeTipsProps) {
  // Generate contextual tips based on performance
  const getTips = (): string[] => {
    const tips: string[] = [];

    if (accuracy < 70) {
      tips.push("Practice at a slower tempo—speed will come naturally");
      tips.push("Focus on one measure at a time before moving forward");
    } else if (accuracy < 85) {
      tips.push("You're doing well! Try practicing difficult sections separately");
      tips.push("Use the metronome to help maintain steady rhythm");
    } else {
      tips.push("Excellent progress! Try increasing the tempo gradually");
      tips.push("Focus on musical expression and dynamics");
    }

    if (mainIssues.some((issue) => issue.toLowerCase().includes("rhythm"))) {
      tips.push("Tap the rhythm before playing to internalize the timing");
    }

    if (mainIssues.some((issue) => issue.toLowerCase().includes("flat") || issue.toLowerCase().includes("sharp"))) {
      tips.push("Listen carefully to each note—intonation improves with focused listening");
    }

    return tips.slice(0, 2); // Max 2 tips to avoid overload
  };

  const tips = getTips();

  if (tips.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-medium text-blue-900">Practice Tips</p>
      </div>
      <ul className="space-y-1">
        {tips.map((tip, idx) => (
          <li key={idx} className="text-xs text-blue-700">
            • {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

