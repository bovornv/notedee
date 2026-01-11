"use client";

import { useRouter } from "next/navigation";
import { usePracticeStore } from "@/store/practiceStore";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import { t } from "@/lib/translations";
import { useEffect, useState } from "react";
import { getPostSessionFeedback } from "@/lib/progressInsights";
import { Flame, CheckCircle2, TrendingUp } from "lucide-react";
import DifficultSections from "@/components/DifficultSections";
import PracticeTips from "@/components/PracticeTips";

export default function ResultsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedPiece, feedback, reset } = usePracticeStore();
  const { addSession, streak, updateStreak } = useProgressStore();
  const [sessionSaved, setSessionSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedPiece || feedback.length === 0) {
      router.push("/main");
      return;
    }

    // Save session to progress store
    if (!sessionSaved && feedback.length > 0) {
      const correctCount = feedback.filter((f) => f.accuracy === "correct").length;
      const totalCount = feedback.length;
      const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

      // Calculate actual duration from recording start time
      // For now, estimate based on feedback (in production, track actual recording duration)
      const duration = Math.max(30, feedback.length * 2); // Rough estimate: 2 seconds per note

      const session = {
        id: `session-${Date.now()}`,
        userId: user.id,
        pieceId: selectedPiece.id,
        pieceTitle: selectedPiece.title,
        startedAt: new Date(),
        duration,
        accuracy,
        feedback,
      };

      addSession(session);
      updateStreak();
      setSessionSaved(true);
    }
  }, [user, selectedPiece, feedback, sessionSaved, addSession, updateStreak, router]);

  if (!selectedPiece || feedback.length === 0) {
    return null;
  }

  const correctCount = feedback.filter((f) => f.accuracy === "correct").length;
  const slightlyOffCount = feedback.filter(
    (f) => f.accuracy === "slightly_off"
  ).length;
  const wrongCount = feedback.filter((f) => f.accuracy === "wrong").length;
  const totalCount = feedback.length;
  const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  // Get main issues
  const allIssues = feedback.flatMap((f) => f.issues);
  const issueCounts: { [key: string]: number } = {};
  allIssues.forEach((issue) => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  const mainIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue]) => issue);

  const fileType = selectedPiece.fileUrl.endsWith(".pdf") ? "pdf" : "image";
  const personalizedFeedback = getPostSessionFeedback(accuracy, feedback);

  const handlePracticeAgain = () => {
    reset();
    router.push("/practice");
  };

  const handleViewProgress = () => {
    router.push("/progress");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Summary with Post-Session Feedback */}
      <div className="border-b border-border bg-accent px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-xl font-semibold">
            {t("results.feedback")}
          </h1>
          
          {/* Post-Session Feedback Card */}
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 mb-1">
                  {personalizedFeedback}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-green-700">
                      {streak} day{streak !== 1 ? "s" : ""} streak
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-green-700">
                      {accuracy.toFixed(0)}% accuracy
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Issues */}
          {mainIssues.length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="mb-2 text-sm font-medium text-orange-900">Areas to focus on:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-orange-700">
                {mainIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Difficult Sections */}
          <DifficultSections feedback={feedback} pieceTitle={selectedPiece.title} />

          {/* Practice Tips */}
          <PracticeTips accuracy={accuracy} mainIssues={mainIssues} />

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-success"></div>
              <span className="text-sm">
                Correct: {correctCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-warning"></div>
              <span className="text-sm">
                Close: {slightlyOffCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-error"></div>
              <span className="text-sm">
                Wrong: {wrongCount}/{totalCount}
              </span>
            </div>
            <div className="ml-auto text-sm font-medium">
              Accuracy: {accuracy.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Music with Feedback */}
      <div className="flex-1 overflow-auto">
        <SheetMusicViewer
          fileUrl={selectedPiece.fileUrl}
          fileType={fileType}
          feedback={feedback}
        />
      </div>

      {/* Action Buttons */}
      <div className="border-t border-border bg-accent px-6 py-4">
        <div className="mx-auto flex max-w-4xl justify-between">
          <button
            onClick={handleViewProgress}
            className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            View Progress
          </button>
          <button
            onClick={handlePracticeAgain}
            className="rounded-lg bg-foreground px-6 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            {t("results.practice_again")}
          </button>
        </div>
      </div>
    </div>
  );
}
