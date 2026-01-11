"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Upload, Music, BarChart3, Target, Zap, Clock } from "lucide-react";
import { usePracticeStore } from "@/store/practiceStore";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import Metronome from "@/components/Metronome";
import MicIndicator from "@/components/MicIndicator";
import Countdown from "@/components/Countdown";
import RecordingIndicator from "@/components/RecordingIndicator";
import { AudioRecorder } from "@/lib/audioRecorder";
import { analyzeAudio, analyzeMeasure } from "@/lib/audioAnalysis";
import { t } from "@/lib/translations";
import { MusicPiece } from "@/types";
import { MIN_TEMPO, MAX_TEMPO } from "@/lib/constants";
import { canStartSession, incrementTodaySessions } from "@/lib/sessionLimits";

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    selectedPiece,
    isRecording,
    recordedAudio,
    metronomeEnabled,
    tempo,
    micPermissionDenied,
    countdown,
    setSelectedPiece,
    setIsRecording,
    setRecordedAudio,
    setFeedback,
    setMetronomeEnabled,
    setTempo,
    setMicPermissionDenied,
    setCountdown,
  } = usePracticeStore();

  const { dailyGoal, practiceMode, setPracticeMode, feedbackMode, setFeedbackMode, sessions } = useProgressStore();

  const [recorder] = useState(() => new AudioRecorder());
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(
    null
  );
  const [showPieceSelector, setShowPieceSelector] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [delayedMeasureFeedback, setDelayedMeasureFeedback] = useState<Map<number, NoteFeedback[]>>(new Map());

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
  }, [user, router]);

  // Calculate today's sessions
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter(
    (s) => new Date(s.startedAt).toISOString().split("T")[0] === today
  ).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
      setUploadedFile(file);
      const fileUrl = URL.createObjectURL(file);
      const piece: MusicPiece = {
        id: `upload-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        type: "user_upload",
        fileUrl,
      };
      setSelectedPiece(piece);
      setShowPieceSelector(false);
      setHasRecorded(false);
      setRecordedAudio(null);
    } else {
      alert("กรุณาเลือกไฟล์ PDF หรือรูปภาพ");
    }
  };

  // Handle countdown and start recording
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      // Continue countdown
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Countdown finished, start actual recording
      const startActualRecording = async () => {
        try {
          await recorder.start();
          setIsRecording(true);
          setRecordingStartTime(Date.now());
          setMicPermissionDenied(false);
          setHasRecorded(false);
          setRecordedAudio(null);
          setCountdown(null);
        } catch (error: any) {
          console.error("Microphone error:", error);
          setMicPermissionDenied(true);
          setIsRecording(false);
          setCountdown(null);
          
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            alert("ไมโครโฟนถูกปฏิเสธ กรุณาอนุญาตการเข้าถึงไมโครโฟนในเบราว์เซอร์");
          } else {
            alert("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบการตั้งค่า");
          }
        }
      };
      startActualRecording();
    }
  }, [countdown, recorder, setCountdown, setIsRecording, setMicPermissionDenied, setHasRecorded, setRecordedAudio]);

  const handleStartRecording = async () => {
    if (!selectedPiece) {
      alert("กรุณาเลือกเพลงก่อน");
      return;
    }

    // Check session limits
    const sessionCheck = canStartSession(user);
    if (!sessionCheck.allowed) {
      alert(sessionCheck.reason || "ไม่สามารถเริ่มการฝึกซ้อมได้");
      return;
    }

    // Start 3-2-1 countdown
    setCountdown(3);
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await recorder.stop();
      setIsRecording(false);
      setRecordedAudio(audioBlob);
      setHasRecorded(true);
      // Clear delayed feedback when stopping
      setDelayedMeasureFeedback(new Map());
    } catch (error) {
      console.error("Error stopping recording:", error);
      alert("เกิดข้อผิดพลาดในการหยุดการบันทึก");
      setIsRecording(false);
    }
  };

  // Set up measure-level feedback monitoring for Practice Mode
  const setupMeasureLevelFeedback = (recordingStartTime: number) => {
    if (feedbackMode !== "practice") return;

    const beatsPerMeasure = 4; // Default 4/4 time
    const secondsPerBeat = 60 / tempo;
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat;

    // Mock expected notes (in production, this would come from sheet music analysis)
    const expectedNotes = [
      { bar: 1, noteIndex: 0, note: "C4", time: 0.5 },
      { bar: 1, noteIndex: 1, note: "C4", time: 1.0 },
      { bar: 1, noteIndex: 2, note: "G4", time: 1.5 },
      { bar: 1, noteIndex: 3, note: "G4", time: 2.0 },
      { bar: 2, noteIndex: 0, note: "A4", time: 2.5 },
      { bar: 2, noteIndex: 1, note: "A4", time: 3.0 },
      { bar: 2, noteIndex: 2, note: "G4", time: 3.5 },
      { bar: 3, noteIndex: 0, note: "F4", time: 4.0 },
      { bar: 3, noteIndex: 1, note: "F4", time: 4.5 },
      { bar: 3, noteIndex: 2, note: "E4", time: 5.0 },
    ];

    let currentMeasure = 1;
    const processedMeasures = new Set<number>();

    const checkMeasureCompletion = async () => {
      if (!isRecording) return;

      const elapsedSeconds = (Date.now() - recordingStartTime) / 1000;
      const expectedMeasure = Math.floor(elapsedSeconds / secondsPerMeasure) + 1;
      const measureStartTime = (expectedMeasure - 1) * secondsPerMeasure;
      const measureEndTime = measureStartTime + secondsPerMeasure;

      // If we've moved to a new measure and the previous one hasn't been processed
      if (expectedMeasure > currentMeasure && !processedMeasures.has(currentMeasure - 1)) {
        const measureToAnalyze = currentMeasure - 1;
        processedMeasures.add(measureToAnalyze);

        // Wait a small delay after measure ends before analyzing (delayed feedback)
        setTimeout(async () => {
          try {
            const measureStart = (measureToAnalyze - 1) * secondsPerMeasure;
            const measureEnd = measureStart + secondsPerMeasure;
            
            const audioBuffer = await recorder.getAudioBufferForRange(measureStart, measureEnd);
            if (audioBuffer) {
              const result = await analyzeMeasure(
                audioBuffer,
                measureToAnalyze,
                measureStart,
                secondsPerMeasure,
                expectedNotes
              );

              if (result && result.feedback.length > 0) {
                setDelayedMeasureFeedback((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(measureToAnalyze, result.feedback);
                  return newMap;
                });
              }
            }
          } catch (error) {
            console.error("Error analyzing measure:", error);
          }
        }, 200); // 200ms delay after measure ends

        currentMeasure = expectedMeasure;
      }

      // Continue checking
      if (isRecording) {
        setTimeout(checkMeasureCompletion, 100); // Check every 100ms
      }
    };

    // Start checking after first measure
    setTimeout(checkMeasureCompletion, secondsPerMeasure * 1000 + 200);
  };

  const handleAnalyze = async () => {
    if (!recordedAudio || !selectedPiece) {
      alert("ไม่มีไฟล์เสียงที่บันทึก");
      return;
    }

    setIsAnalyzing(true);

    try {
      const audioBuffer = await recorder.getAudioBuffer(recordedAudio);

      // Mock expected notes (in production, this would come from sheet music analysis)
      const expectedNotes = [
        { bar: 1, noteIndex: 0, note: "C4", time: 0.5 },
        { bar: 1, noteIndex: 1, note: "C4", time: 1.0 },
        { bar: 1, noteIndex: 2, note: "G4", time: 1.5 },
        { bar: 1, noteIndex: 3, note: "G4", time: 2.0 },
        { bar: 2, noteIndex: 0, note: "A4", time: 2.5 },
        { bar: 2, noteIndex: 1, note: "A4", time: 3.0 },
        { bar: 2, noteIndex: 2, note: "G4", time: 3.5 },
        { bar: 3, noteIndex: 0, note: "F4", time: 4.0 },
        { bar: 3, noteIndex: 1, note: "F4", time: 4.5 },
        { bar: 3, noteIndex: 2, note: "E4", time: 5.0 },
      ];

      const result = await analyzeAudio(audioBuffer, expectedNotes);
      setFeedback(result.feedback);

      // Increment session count for free tier
      if (user?.subscriptionTier === "free") {
        incrementTodaySessions();
      }

      // Navigate to results page
      router.push("/results");
    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert("เกิดข้อผิดพลาดในการวิเคราะห์เสียง");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetryMic = async () => {
    setMicPermissionDenied(false);
    // Try to request permission again
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted, can now record
    } catch (error) {
      setMicPermissionDenied(true);
    }
  };

  if (!user) {
    return null;
  }

  const fileType =
    selectedPiece?.fileUrl.endsWith(".pdf") ||
    uploadedFile?.type === "application/pdf"
      ? "pdf"
      : "image";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Metronome />
      <Countdown count={countdown} onComplete={() => {}} />
      <RecordingIndicator isRecording={isRecording} />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Header with Daily Goal */}
          <div className="border-b border-border bg-accent px-6 py-4">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-semibold">
                  {selectedPiece
                    ? selectedPiece.title
                    : t("practice.select_piece")}
                </h1>
                <MicIndicator
                  isRecording={isRecording}
                  hasPermission={!micPermissionDenied}
                />
              </div>
              
              {/* Daily Goal Display */}
              <div className="flex items-center gap-4 rounded-lg bg-background/50 p-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-foreground">Today&apos;s Goal:</span>
                  <span className="text-xs text-muted-foreground">
                    {dailyGoal.targetAccuracy}% accuracy
                  </span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">
                    {todaySessions}/{dailyGoal.targetSessions} sessions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Practice Settings - Always visible */}
          <div className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-background px-6 py-5 shadow-md">
            <div className="mx-auto max-w-4xl">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">⚙️</span>
                <span>Practice Settings</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Practice Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground block">Practice Mode</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "normal", label: "Normal", icon: Music },
                      { value: "accuracy", label: "Accuracy", icon: Target },
                      { value: "rhythm", label: "Rhythm", icon: Zap },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isActive = practiceMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => setPracticeMode(mode.value as "normal" | "accuracy" | "rhythm")}
                          disabled={isRecording || countdown !== null}
                          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-foreground text-background shadow-md"
                              : "bg-accent text-foreground hover:bg-accent/80"
                          } disabled:opacity-50`}
                        >
                          <Icon className="h-4 w-4" />
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  {practiceMode !== "normal" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {practiceMode === "accuracy"
                        ? "Focus on hitting the right notes. Speed doesn't matter."
                        : "Focus on keeping steady rhythm. Use the metronome to help."}
                    </p>
                  )}
                </div>

                {/* Live Feedback Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-blue-700 block">🎯 Live Feedback Mode</label>
                  <div className="flex gap-3">
                    {[
                      { value: "calm", label: "Calm", description: "Minimal guidance" },
                      { value: "practice", label: "Practice", description: "Delayed measure feedback" },
                    ].map((mode) => {
                      const isActive = feedbackMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => setFeedbackMode(mode.value as "calm" | "practice")}
                          disabled={isRecording || countdown !== null}
                          className={`flex flex-col items-start rounded-xl px-5 py-3 text-xs font-medium transition-all border-2 min-w-[130px] transform hover:scale-105 ${
                            isActive
                              ? "bg-blue-600 text-white border-blue-700 shadow-lg ring-2 ring-blue-300"
                              : "bg-white text-foreground hover:bg-blue-50 border-gray-300 shadow-sm"
                          } disabled:opacity-50 disabled:hover:scale-100`}
                        >
                          <span className="font-bold text-sm">{mode.label}</span>
                          <span className={`text-[10px] mt-1 ${isActive ? "text-blue-100" : "text-gray-600"}`}>
                            {mode.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {feedbackMode === "calm" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Position tracking only. No correctness feedback during play. Full analysis after you finish.
                    </p>
                  )}
                  {feedbackMode === "practice" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Delayed measure-level feedback. Shows correctness after each measure ends. Still calm and supportive.
                    </p>
                  )}
                </div>
              </div>
            </div>

          {/* Recording Status Message */}
          {isRecording && (
            <div className="border-b border-blue-200 bg-blue-50 px-6 py-2">
              <div className="mx-auto max-w-4xl">
                <p className="text-xs text-blue-700">
                  🎵 Playing... The app is listening. Focus on your music, not the screen.
                </p>
              </div>
            </div>
          )}

          {/* Sheet Music Viewer */}
          <div className="flex-1 overflow-auto">
            {selectedPiece ? (
              <SheetMusicViewer
                fileUrl={selectedPiece.fileUrl}
                fileType={fileType}
                isRecording={isRecording}
                recordingStartTime={recordingStartTime}
                feedbackMode={feedbackMode}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Music className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("practice.select_piece")}
                  </p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Choose a piece to start practicing
                  </p>
                  <button
                    onClick={() => setShowPieceSelector(true)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {t("practice.select_piece")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="border-t border-border bg-accent px-6 py-4">
            <div className="mx-auto max-w-4xl">
              {/* Piece Selector Modal */}
              {showPieceSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                    <h2 className="mb-4 text-lg font-semibold">
                      {t("practice.select_piece")}
                    </h2>
                    <div className="mb-4 space-y-2">
                      <button
                        onClick={() => router.push("/explore")}
                        className="w-full rounded border border-border bg-background px-4 py-2 text-left hover:bg-accent"
                      >
                        <div className="font-medium">สำรวจเพลงสาธารณะ</div>
                        <div className="text-sm text-muted">
                          เลือกจากรายการเพลง
                        </div>
                      </button>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium">
                        หรืออัปโหลดไฟล์
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-muted file:mr-4 file:rounded file:border file:border-border file:bg-background file:px-4 file:py-2 file:hover:bg-accent"
                      />
                    </label>
                    <button
                      onClick={() => setShowPieceSelector(false)}
                      className="mt-4 w-full rounded border border-border bg-background px-4 py-2 hover:bg-accent"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {/* Mic Permission Error */}
              {micPermissionDenied && (
                <div className="mb-4 rounded-lg border border-error bg-error/10 p-4">
                  <p className="mb-2 text-sm text-error">
                    ไม่สามารถเข้าถึงไมโครโฟนได้
                  </p>
                  <button
                    onClick={handleRetryMic}
                    className="rounded bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90"
                  >
                    ลองอีกครั้ง
                  </button>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-between gap-4">
                {/* Record/Stop Button */}
                <div className="flex items-center gap-4">
                  {!hasRecorded ? (
                    <button
                      onClick={
                        isRecording ? handleStopRecording : handleStartRecording
                      }
                      disabled={!selectedPiece || micPermissionDenied || countdown !== null}
                      className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors ${
                        isRecording
                          ? "bg-error text-white hover:bg-error/90"
                          : "bg-success text-white hover:bg-success/90 disabled:bg-muted disabled:text-foreground"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="h-5 w-5" />
                          {t("practice.stop")}
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" />
                          {t("practice.record")}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !recordedAudio}
                      className="flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                    >
                      <BarChart3 className="h-5 w-5" />
                      {isAnalyzing ? "กำลังวิเคราะห์..." : "วิเคราะห์ผลการเล่น"}
                    </button>
                  )}
                </div>

                {/* Metronome Controls */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={metronomeEnabled}
                      onChange={(e) => setMetronomeEnabled(e.target.checked)}
                      disabled={isRecording || countdown !== null}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{t("practice.metronome")}</span>
                  </label>
                  {metronomeEnabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted">
                        {t("practice.tempo")}
                      </span>
                      <input
                        type="range"
                        min={MIN_TEMPO}
                        max={MAX_TEMPO}
                        value={tempo}
                        onChange={(e) => setTempo(parseInt(e.target.value))}
                        disabled={isRecording || countdown !== null}
                        className="w-24"
                      />
                      <span className="w-12 text-sm font-medium">{tempo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
