"use client";

import { NoteFeedback } from "@/types";
import { Repeat, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/lib/translations";

interface DifficultSectionsProps {
  feedback: NoteFeedback[];
  pieceTitle: string;
}

export default function DifficultSections({ feedback, pieceTitle }: DifficultSectionsProps) {
  const router = useRouter();
  const { language } = useLanguageStore();

  // Identify difficult measures (measures with wrong or mostly wrong notes)
  const measureAccuracy: { [bar: number]: { correct: number; total: number } } = {};

  feedback.forEach((note) => {
    if (!measureAccuracy[note.bar]) {
      measureAccuracy[note.bar] = { correct: 0, total: 0 };
    }
    measureAccuracy[note.bar].total++;
    if (note.accuracy === "correct") {
      measureAccuracy[note.bar].correct++;
    }
  });

  const difficultMeasures = Object.entries(measureAccuracy)
    .map(([bar, stats]) => ({
      bar: parseInt(bar),
      accuracy: (stats.correct / stats.total) * 100,
      totalNotes: stats.total,
    }))
    .filter((m) => m.accuracy < 70) // Less than 70% accuracy
    .sort((a, b) => a.accuracy - b.accuracy) // Most difficult first
    .slice(0, 3); // Top 3 most difficult

  if (difficultMeasures.length === 0) {
    return null;
  }

  const handlePracticeSection = (startBar: number, endBar?: number) => {
    // Keep the current piece selected and navigate to practice
    // The practice page can highlight these measures
    router.push("/practice");
    // Note: In a full implementation, we'd pass the measure range to practice page
    // For now, we'll just navigate and let the user know which measures to focus on
  };

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h3 className="text-sm font-semibold text-orange-900">
          {t("results.practice_sections", language)}
        </h3>
      </div>
      <p className="mb-3 text-xs text-orange-700">
        {t("results.focus_measures", language)}
      </p>
      <div className="space-y-2">
        {difficultMeasures.map((measure) => (
          <div
            key={measure.bar}
            className="flex items-center justify-between rounded-md border border-orange-300 bg-white p-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-orange-900">
                {t("results.measure", language)} {measure.bar}
              </span>
              <span className="text-xs text-orange-600">
                {measure.accuracy.toFixed(0)}% {t("results.accuracy", language)}
              </span>
            </div>
            <button
              onClick={() => handlePracticeSection(measure.bar)}
              className="flex items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700"
            >
              <Repeat className="h-3 w-3" />
              {t("results.practice", language)}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push("/practice")}
        className="mt-3 w-full rounded-md border border-orange-300 bg-white px-3 py-2 text-xs font-medium text-orange-900 hover:bg-orange-100"
      >
        {t("results.practice_full_piece", language)}
      </button>
    </div>
  );
}

