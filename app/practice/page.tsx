"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Upload, Music, BarChart3, Target, Zap, Clock, RefreshCw } from "lucide-react";
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
import { extractExpectedNotes, calculateMeasureBoundaries } from "@/lib/notationParser";
import { t } from "@/lib/translations";
import { MusicPiece, NoteFeedback } from "@/types";
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
  const [analyzingMeasures, setAnalyzingMeasures] = useState<Set<number>>(new Set());
  const [measureAnalysisErrors, setMeasureAnalysisErrors] = useState<Map<number, string>>(new Map());

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
      // Clean up delayed feedback when changing pieces
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
      setMeasureAnalysisErrors(new Map());
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
          // Clean up any previous delayed feedback before starting new recording
          setDelayedMeasureFeedback(new Map());
          setAnalyzingMeasures(new Set());
          setMeasureAnalysisErrors(new Map());
          
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
          // Clean up on error
          setDelayedMeasureFeedback(new Map());
          setAnalyzingMeasures(new Set());
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
      // Clean up delayed feedback and analyzing measures when stopping
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
    } catch (error) {
      console.error("Error stopping recording:", error);
      alert("เกิดข้อผิดพลาดในการหยุดการบันทึก");
      setIsRecording(false);
      // Clean up on error too
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
    }
  };

  // Set up measure-level feedback monitoring for Practice Mode
  useEffect(() => {
    if (!isRecording || feedbackMode !== "practice" || !recordingStartTime || !selectedPiece) {
      setAnalyzingMeasures(new Set());
      return;
    }

    // Extract expected notes from notation data or use defaults
    const expectedNotes = extractExpectedNotes(selectedPiece, tempo, 20); // Get up to 20 measures

    // Use actual time signature from piece or default to 4/4
    const actualTimeSignature = selectedPiece.notationData?.timeSignature || { numerator: 4, denominator: 4 };
    const beatsPerMeasure = actualTimeSignature.numerator;
    const secondsPerBeat = 60 / tempo;
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat;

    // Track tempo changes during recording for dynamic boundary recalculation
    let lastTempo = tempo;
    let tempoChangeTime = recordingStartTime;
    let accumulatedTimeBeforeTempoChange = 0;

    // Recalculate measure boundaries when tempo changes
    const recalculateBoundaries = () => {
      if (!selectedPiece.notationData) return null;
      
      // Calculate boundaries based on current tempo
      const boundaries = calculateMeasureBoundaries(selectedPiece.notationData, tempo);
      
      // Adjust for tempo changes: if tempo changed mid-recording, we need to offset
      if (lastTempo !== tempo && tempoChangeTime !== recordingStartTime) {
        const timeAtChange = (tempoChangeTime - recordingStartTime) / 1000;
        const tempoRatio = lastTempo / tempo; // How much faster/slower new tempo is
        
        // Adjust boundaries after tempo change
        return boundaries.map((boundary) => {
          if (boundary.startTime > timeAtChange) {
            // This boundary is after tempo change - adjust it
            const timeAfterChange = boundary.startTime - timeAtChange;
            const adjustedTime = timeAtChange + (timeAfterChange * tempoRatio);
            return {
              ...boundary,
              startTime: adjustedTime,
              endTime: adjustedTime + (boundary.endTime - boundary.startTime) * tempoRatio,
            };
          }
          return boundary;
        });
      }
      
      return boundaries;
    };

    // Initial measure boundaries
    let measureBoundaries = selectedPiece.notationData
      ? calculateMeasureBoundaries(selectedPiece.notationData, tempo)
      : null;

    let currentMeasure = 1;
    const processedMeasures = new Set<number>();
    let intervalId: NodeJS.Timeout | null = null;
    let lastCheckTime = Date.now();

    const checkMeasureCompletion = async () => {
      if (!isRecording) {
        if (intervalId) clearInterval(intervalId);
        return;
      }

      // Check for tempo changes and recalculate boundaries if needed
      if (lastTempo !== tempo) {
        tempoChangeTime = Date.now();
        accumulatedTimeBeforeTempoChange += (tempoChangeTime - lastCheckTime) / 1000;
        measureBoundaries = recalculateBoundaries();
        lastTempo = tempo;
      }

      const now = Date.now();
      const elapsedSeconds = (now - recordingStartTime) / 1000;

      // Use precise measure boundaries if available, otherwise estimate
      let expectedMeasure: number;
      let measureStart: number;
      let measureEnd: number;

      if (measureBoundaries && measureBoundaries.length > 0) {
        // Find current measure using precise boundaries
        const currentBoundary = measureBoundaries.find(
          (boundary) => elapsedSeconds >= boundary.startTime && elapsedSeconds < boundary.endTime
        );
        
        if (currentBoundary) {
          expectedMeasure = currentBoundary.measureNumber;
          measureStart = currentBoundary.startTime;
          measureEnd = currentBoundary.endTime;
        } else {
          // Fallback to estimation (use current tempo, not initial tempo)
          const currentSecondsPerMeasure = beatsPerMeasure * (60 / tempo);
          expectedMeasure = Math.floor(elapsedSeconds / currentSecondsPerMeasure) + 1;
          measureStart = (expectedMeasure - 1) * currentSecondsPerMeasure;
          measureEnd = measureStart + currentSecondsPerMeasure;
        }
      } else {
        // Estimate measure boundaries based on current tempo (not initial tempo)
        const currentSecondsPerMeasure = beatsPerMeasure * (60 / tempo);
        expectedMeasure = Math.floor(elapsedSeconds / currentSecondsPerMeasure) + 1;
        measureStart = (expectedMeasure - 1) * currentSecondsPerMeasure;
        measureEnd = measureStart + currentSecondsPerMeasure;
      }

      // If we've moved to a new measure and the previous one hasn't been processed
      if (expectedMeasure > currentMeasure && !processedMeasures.has(currentMeasure - 1)) {
        const measureToAnalyze = currentMeasure - 1;
        processedMeasures.add(measureToAnalyze);
        
        // Update analyzing state
        setAnalyzingMeasures((prev) => {
          const newSet = new Set(prev);
          newSet.add(measureToAnalyze);
          return newSet;
        });

        // Calculate actual measure boundaries for the measure being analyzed
        let actualMeasureStart: number;
        let actualMeasureEnd: number;

        if (measureBoundaries && measureBoundaries[measureToAnalyze - 1]) {
          const boundary = measureBoundaries[measureToAnalyze - 1];
          actualMeasureStart = boundary.startTime;
          actualMeasureEnd = boundary.endTime;
        } else {
          actualMeasureStart = (measureToAnalyze - 1) * secondsPerMeasure;
          actualMeasureEnd = actualMeasureStart + secondsPerMeasure;
        }

        // Wait a small delay after measure ends before analyzing (delayed feedback)
        setTimeout(async () => {
          try {
            const audioBuffer = await recorder.getAudioBufferForRange(actualMeasureStart, actualMeasureEnd);
            if (audioBuffer && audioBuffer.length > 0) {
              const result = await analyzeMeasure(
                audioBuffer,
                measureToAnalyze,
                actualMeasureStart,
                actualMeasureEnd - actualMeasureStart,
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
            // Store user-friendly error message
            const errorMessage = error instanceof Error 
              ? error.message.includes("audio") || error.message.includes("buffer")
                ? "Couldn't analyze this measure. Keep playing!"
                : "Analysis skipped for this measure."
              : "Analysis skipped for this measure.";
            
            setMeasureAnalysisErrors((prev) => {
              const newMap = new Map(prev);
              newMap.set(measureToAnalyze, errorMessage);
              return newMap;
            });
            
            // Remove error message after 3 seconds (non-intrusive)
            setTimeout(() => {
              setMeasureAnalysisErrors((prev) => {
                const newMap = new Map(prev);
                newMap.delete(measureToAnalyze);
                return newMap;
              });
            }, 3000);
          } finally {
            setAnalyzingMeasures((prev) => {
              const newSet = new Set(prev);
              newSet.delete(measureToAnalyze);
              return newSet;
            });
          }
        }, 200); // 200ms delay after measure ends

        currentMeasure = expectedMeasure;
      }

      lastCheckTime = now;
    };

    // Debounce: Check every 100ms (reduced from immediate checks)
    intervalId = setInterval(checkMeasureCompletion, 100);

    return () => {
      if (intervalId) clearInterval(intervalId);
      setAnalyzingMeasures(new Set());
      setMeasureAnalysisErrors(new Map());
    };
  }, [isRecording, feedbackMode, recordingStartTime, tempo, recorder, selectedPiece]);

  const handleAnalyze = async () => {
    if (!recordedAudio || !selectedPiece) {
      alert("ไม่มีไฟล์เสียงที่บันทึก");
      return;
    }

    setIsAnalyzing(true);

    try {
      const audioBuffer = await recorder.getAudioBuffer(recordedAudio);

      // Extract expected notes from notation data or use defaults
      const expectedNotes = extractExpectedNotes(selectedPiece, tempo);

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
          {/* Compact Header - Single Row */}
          <div className="border-b border-border bg-accent px-4 py-1.5">
            <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h1 className="text-sm font-semibold truncate">
                  {selectedPiece
                    ? selectedPiece.title
                    : t("practice.select_piece")}
                </h1>
                {selectedPiece && (
                  <button
                    onClick={() => setShowPieceSelector(true)}
                    disabled={isRecording || countdown !== null}
                    className="flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Change song"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Change</span>
                  </button>
                )}
              </div>
              
              {/* Compact Daily Goal - Inline */}
              <div className="flex items-center gap-2 shrink-0">
                <Target className="h-3 w-3 text-blue-600" />
                <span className="text-[10px] text-muted-foreground">
                  {dailyGoal.targetAccuracy}%
                </span>
                <div className="h-2.5 w-px bg-border" />
                <Clock className="h-3 w-3 text-purple-600" />
                <span className="text-[10px] text-muted-foreground">
                  {todaySessions}/{dailyGoal.targetSessions}
                </span>
              </div>
              
              <div className="shrink-0">
                <MicIndicator
                  isRecording={isRecording}
                  hasPermission={!micPermissionDenied}
                />
              </div>
            </div>
          </div>

          {/* Compact Practice Settings - Single Horizontal Row */}
          <div className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-background px-4 py-1.5">
            <div className="mx-auto max-w-4xl flex items-center gap-4 flex-wrap">
              {/* Practice Mode */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">Mode:</span>
                <div className="flex gap-1">
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
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                          isActive
                            ? "bg-foreground text-background"
                            : "bg-accent text-foreground hover:bg-accent/80"
                        } disabled:opacity-50`}
                        title={mode.label}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-4 w-px bg-border" />

              {/* Live Feedback Mode */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-blue-700 shrink-0">Feedback:</span>
                <div className="flex gap-1">
                  {[
                    { value: "calm", label: "Calm" },
                    { value: "practice", label: "Practice" },
                  ].map((mode) => {
                    const isActive = feedbackMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => setFeedbackMode(mode.value as "calm" | "practice")}
                        disabled={isRecording || countdown !== null}
                        className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors border ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-700"
                            : "bg-white text-foreground hover:bg-blue-50 border-gray-300"
                        } disabled:opacity-50`}
                        title={mode.value === "calm" ? "Minimal guidance" : "Delayed measure feedback"}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recording Status Message - Compact */}
          {isRecording && (
            <div className="border-b border-blue-200 bg-blue-50 px-4 py-1">
              <div className="mx-auto max-w-4xl">
                <p className="text-[10px] text-blue-700">
                  🎵 Playing... Focus on your music.
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
                delayedMeasureFeedback={delayedMeasureFeedback}
                analyzingMeasures={analyzingMeasures}
                measureAnalysisErrors={measureAnalysisErrors}
                tempo={tempo}
                timeSignature={selectedPiece.notationData?.timeSignature || { numerator: 4, denominator: 4 }}
                notationData={selectedPiece.notationData}
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
