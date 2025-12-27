"use client";

import { useRouter } from "next/navigation";
import { usePracticeStore } from "@/store/practiceStore";
import { useAuthStore } from "@/store/authStore";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import { t } from "@/lib/translations";
import { useEffect } from "react";

export default function ResultsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedPiece, feedback, reset } = usePracticeStore();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!selectedPiece || feedback.length === 0) {
      router.push("/main");
      return;
    }
  }, [user, selectedPiece, feedback.length, router]);

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

  const handlePracticeAgain = () => {
    reset();
    router.push("/main");
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Summary */}
      <div className="border-b border-border bg-accent px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-xl font-semibold">
            {t("results.feedback")}
          </h1>
          
          {/* Main Issues */}
          {mainIssues.length > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-background p-3">
              <p className="mb-2 text-sm font-medium">ประเด็นหลัก:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted">
                {mainIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-success"></div>
              <span className="text-sm">
                ถูกต้อง: {correctCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-warning"></div>
              <span className="text-sm">
                ใกล้เคียง: {slightlyOffCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-error"></div>
              <span className="text-sm">
                ผิด: {wrongCount}/{totalCount}
              </span>
            </div>
            <div className="ml-auto text-sm font-medium">
              ความแม่นยำ: {accuracy.toFixed(0)}%
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
        <div className="mx-auto flex max-w-4xl justify-end">
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
