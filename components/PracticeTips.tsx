"use client";

import { Lightbulb } from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/lib/translations";

interface PracticeTipsProps {
  accuracy: number;
  mainIssues: string[];
}

export default function PracticeTips({ accuracy, mainIssues }: PracticeTipsProps) {
  const { language } = useLanguageStore();
  
  // Generate contextual tips based on performance
  const getTips = (): string[] => {
    const tips: string[] = [];

    if (accuracy < 70) {
      tips.push(t("results.tip_slow_tempo", language));
      tips.push(t("results.tip_one_measure", language));
    } else if (accuracy < 85) {
      tips.push(t("results.tip_doing_well", language));
      tips.push(t("results.tip_metronome", language));
    } else {
      tips.push(t("results.tip_excellent", language));
      tips.push(t("results.tip_expression", language));
    }

    if (mainIssues.some((issue) => issue.toLowerCase().includes("rhythm"))) {
      tips.push(t("results.tip_rhythm", language));
    }

    if (mainIssues.some((issue) => issue.toLowerCase().includes("flat") || issue.toLowerCase().includes("sharp"))) {
      tips.push(t("results.tip_intonation", language));
    }

    return tips.slice(0, 2); // Max 2 tips to avoid overload
  };

  const tips = getTips();

  if (tips.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-medium text-blue-900">{t("results.practice_tips", language)}</p>
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

