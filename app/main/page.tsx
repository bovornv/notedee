"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { usePracticeStore } from "@/store/practiceStore";
import { useProgressStore } from "@/store/progressStore";
import { useLanguageStore } from "@/store/languageStore";
import { Play, Square, Music, X, CheckCircle2, Sparkles, Settings, ChevronRight, Upload } from "lucide-react";
import SheetMusicViewer from "@/components/SheetMusicViewer";
import Metronome from "@/components/Metronome";
import MicIndicator from "@/components/MicIndicator";
import { AudioRecorder } from "@/lib/audioRecorder";
import { analyzeAudio } from "@/lib/audioAnalysis";
import { MusicPiece } from "@/types";
import { MIN_TEMPO, MAX_TEMPO } from "@/lib/constants";
import { canStartSession, incrementTodaySessions, getTodaySessions } from "@/lib/sessionLimits";
import { t } from "@/lib/translations";
import { STARTER_VIOLIN_LIBRARY } from "@/lib/starterLibrary";
import { getPracticeRecommendations } from "@/lib/progressInsights";

export default function MainPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, initialize } = useLanguageStore();
  const {
    selectedPiece,
    isRecording,
    recordedAudio,
    analysisCompleted,
    metronomeEnabled,
    tempo,
    timeSignature,
    feedback,
    micPermissionDenied,
    countdown: storeCountdown,
    setSelectedPiece,
    setIsRecording,
    setRecordedAudio,
    setAnalysisCompleted,
    setFeedback,
    setMetronomeEnabled,
    setTempo,
    setTimeSignature,
    setMicPermissionDenied,
    setCountdown,
    resetSteps2And3,
  } = usePracticeStore();

  const { sessions, getWeakSpots, getMostPracticedSong, feedbackMode, setFeedbackMode, practiceMode, setPracticeMode } = useProgressStore();

  const [recorder] = useState(() => new AudioRecorder());
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [todaySessions, setTodaySessions] = useState(0);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else if (user.subscriptionTier === "free") {
      setTodaySessions(getTodaySessions());
    }
  }, [user, router]);

  // Handle countdown and start recording
  useEffect(() => {
    if (storeCountdown === null) return;

    if (storeCountdown > 0) {
      // Continue countdown
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(storeCountdown - 1);
      }, 1000);
    } else if (storeCountdown === 0) {
      // Countdown finished, start actual recording
      const startActualRecording = async () => {
        try {
          await recorder.start();
          recordingStartTimeRef.current = Date.now();
          setIsRecording(true);
          setCountdown(null);
        } catch (error: any) {
          console.error("Error starting recording:", error);
          setMicPermissionDenied(true);
          setCountdown(null);
          recordingStartTimeRef.current = null;
          alert(t("error.mic_failed", language));
        }
      };
      startActualRecording();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [storeCountdown, recorder, language, setCountdown, setIsRecording, setMicPermissionDenied]);

  // Set Student Mode defaults when mode changes
  useEffect(() => {
    if (!showAdvancedMode) {
      setFeedbackMode("calm");
      setPracticeMode("normal");
    }
  }, [showAdvancedMode, setFeedbackMode, setPracticeMode]);

  // Get personalized recommended songs
  const getRecommendedSongs = () => {
    if (sessions.length === 0) {
      return STARTER_VIOLIN_LIBRARY.filter(s => s.difficulty === 1).slice(0, 5);
    }
    const mostPracticedSong = getMostPracticedSong();
    const weakSpots = getWeakSpots();
    const recommendation = getPracticeRecommendations(sessions, mostPracticedSong, weakSpots);
    const recommendedSong = STARTER_VIOLIN_LIBRARY.find(s => s.title === recommendation.suggestedSong);
    const recommendedList: MusicPiece[] = [];
    if (recommendedSong) {
      recommendedList.push(recommendedSong);
    }
    const recommendedDifficulty = recommendedSong?.difficulty || 1;
    const similarDifficultySongs = STARTER_VIOLIN_LIBRARY
      .filter(s => s.difficulty === recommendedDifficulty && s.id !== recommendedSong?.id)
      .slice(0, 2);
    recommendedList.push(...similarDifficultySongs);
    const remaining = STARTER_VIOLIN_LIBRARY
      .filter(s => !recommendedList.some(r => r.id === s.id))
      .slice(0, 5 - recommendedList.length);
    recommendedList.push(...remaining);
    return recommendedList.slice(0, 5);
  };

  const recommendedSongs = getRecommendedSongs();

  const handleSelectSong = (song: MusicPiece) => {
    setSelectedPiece(song);
    setShowAdvancedMode(false);
    resetSteps2And3();
  };

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
      resetSteps2And3();
      setSelectedPiece(piece);
      setShowAdvancedMode(false);
    } else {
      alert(t("error.invalid_file", language));
    }
  };

  // If no piece selected, show new selection screen
  if (!selectedPiece && !isRecording) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50">
        <Metronome />
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl px-6 py-12">
            {/* Header */}
            <div className="mb-12 text-center">
              <h1 className="mb-3 text-3xl font-light text-gray-900">{t("practice.start_session", language)}</h1>
              <p className="text-base text-gray-600">{t("practice.subtitle", language)}</p>
            </div>

            {/* Mode Selector */}
            <div className="mb-10 flex justify-center gap-2">
              <button
                onClick={() => setShowAdvancedMode(false)}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  !showAdvancedMode
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-4 w-4 ${!showAdvancedMode ? "text-white" : "text-gray-600"}`} />
                  <span>{t("practice.student_mode", language)}</span>
                </div>
              </button>
              <button
                onClick={() => setShowAdvancedMode(true)}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                  showAdvancedMode
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className={`h-4 w-4 ${showAdvancedMode ? "text-white" : "text-gray-600"}`} />
                  <span>{t("practice.advanced_mode", language)}</span>
                </div>
              </button>
            </div>

            {/* Advanced Mode Settings Panel */}
            {showAdvancedMode && (
              <div className="mb-8 rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                <h3 className="mb-4 text-base font-semibold text-blue-900 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("practice.advanced_mode", language)} {t("practice.settings", language)}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-blue-800">
                      {t("practice.feedback_mode", language)}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackMode("calm")}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          feedbackMode === "calm"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                        }`}
                      >
                        {t("practice.calm_feedback", language)}
                      </button>
                      <button
                        onClick={() => setFeedbackMode("practice")}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          feedbackMode === "practice"
                            ? "bg-blue-600 text-white"
                            : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                        }`}
                      >
                        {t("practice.practice_feedback", language)}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-blue-800">
                      {t("practice.practice_mode", language)}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: "normal", label: t("practice.normal_mode", language) },
                        { value: "accuracy", label: t("practice.accuracy_mode", language) },
                        { value: "rhythm", label: t("practice.rhythm_mode", language) },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setPracticeMode(mode.value as "normal" | "accuracy" | "rhythm")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            practiceMode === mode.value
                              ? "bg-blue-600 text-white"
                              : "bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Music Selection */}
            <div className="space-y-8">
              {/* Primary: Recommended for You */}
              <div>
                <h2 className="mb-4 text-lg font-medium text-gray-900">{t("practice.recommended", language)}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {recommendedSongs.map((song, index) => {
                    const isTopRecommendation = index === 0 && sessions.length > 0;
                    return (
                      <div
                        key={song.id}
                        className={`group rounded-lg border-2 p-5 transition-all ${
                          isTopRecommendation
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            {isTopRecommendation && (
                              <div className="mb-1 text-xs font-medium text-blue-600">⭐ {t("practice.recommended", language)}</div>
                            )}
                            <div className={`text-base font-medium ${
                              isTopRecommendation ? "text-blue-900" : "text-gray-900"
                            }`}>
                              {song.title}
                            </div>
                            <div className={`mt-1 text-sm ${isTopRecommendation ? "text-blue-700" : "text-gray-500"}`}>
                              {song.composer}
                            </div>
                            {song.difficulty && (
                              <div className="mt-1 text-xs text-gray-400">
                                {"⭐".repeat(song.difficulty)}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectSong(song)}
                          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Play className="h-4 w-4" />
                          <span>{t("practice.start_practice", language)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Secondary: Explore Public Music */}
              <div className="border-t border-gray-200 pt-8">
                <button
                  onClick={() => router.push("/explore")}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div>
                    <div className="text-base font-medium text-gray-900">{t("practice.explore", language)}</div>
                    <div className="mt-1 text-sm text-gray-500">{t("practice.explore_desc", language)}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Tertiary: Upload Your Own */}
              <div className="border-t border-gray-200 pt-8">
                <label className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white p-4 transition-colors hover:bg-gray-50">
                  <div>
                    <div className="text-base font-medium text-gray-900">{t("practice.upload", language)}</div>
                    <div className="mt-1 text-sm text-gray-500">{t("practice.upload_desc", language)}</div>
                  </div>
                  <Upload className="h-5 w-5 text-gray-400" />
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* What Happens Next Preview */}
            <div className="mt-12 rounded-lg bg-blue-50 border border-blue-100 p-6">
              <h3 className="mb-4 text-base font-medium text-blue-900">{t("practice.what_next", language)}</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-900">
                    1
                  </div>
                  <div>
                    <div className="font-medium">{t("practice.countdown", language)}</div>
                    <div className="text-blue-700">{t("practice.countdown_desc", language)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-900">
                    2
                  </div>
                  <div>
                    <div className="font-medium">{t("practice.play_music", language)}</div>
                    <div className="text-blue-700">{t("practice.play_music_desc", language)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-900">
                    3
                  </div>
                  <div>
                    <div className="font-medium">{t("practice.get_feedback", language)}</div>
                    <div className="text-blue-700">{t("practice.get_feedback_desc", language)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Priority: uploaded file > selected piece file
  // When selecting from explore, selectedPiece.fileUrl should be used
  const activeFileUrl = uploadedFileUrl || selectedPiece?.fileUrl || null;
  const fileType =
    activeFileUrl?.endsWith(".pdf") ||
    uploadedFile?.type === "application/pdf"
      ? "pdf"
      : "image";

  const hasRecording = !!recordedAudio && !isRecording;
  const hasAnalysis = feedback.length > 0;
  // Starter songs (public_domain) are hard-bound to their PDFs - always treat as real music
  // User uploads are also real music
  const hasRealMusic = !!activeFileUrl && (selectedPiece?.type === "public_domain" || selectedPiece?.type === "user_upload");

  const handleFileUploadDirect = (file: File) => {
    if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
      setUploadedFile(file);
      const fileUrl = URL.createObjectURL(file);
      setUploadedFileUrl(fileUrl);
      // Reset practice state when new file is uploaded
      resetSteps2And3();
      setRecordedAudio(null);
      setFeedback([]);
      setAnalysisCompleted(false);
    } else {
      alert(t("error.invalid_file", language));
    }
  };

  const handleStartRecording = async () => {
    if (!hasRealMusic) {
      alert(language === "en" 
        ? "Please upload sheet music first"
        : "กรุณาอัปโหลดโน้ตเพลงก่อน");
      return;
    }

    const sessionCheck = canStartSession(user);
    if (!sessionCheck.allowed) {
      alert(sessionCheck.reason || t("error.mic_failed", language));
      return;
    }

    // Request mic permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionDenied(false);
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      setMicPermissionDenied(true);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        alert(t("error.mic_denied", language));
      } else {
        alert(t("error.mic_failed", language));
      }
      return;
    }

    // Start countdown
    setCountdown(3);
    setRecordedAudio(null);
    setFeedback([]);
    setAnalysisCompleted(false);
  };

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await recorder.stop();
      setIsRecording(false);
      setRecordedAudio(audioBlob);
      recordingStartTimeRef.current = null; // Stop auto-scroll
    } catch (error) {
      console.error("Error stopping recording:", error);
      alert(t("error.mic_failed", language));
      setIsRecording(false);
      recordingStartTimeRef.current = null;
    }
  };

  const handleSubmit = async () => {
    if (!recordedAudio || !hasRealMusic) return;

    setIsAnalyzing(true);

    try {
      const audioBuffer = await recorder.getAudioBuffer(recordedAudio);

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
      setAnalysisCompleted(true);

      if (user?.subscriptionTier === "free") {
        incrementTodaySessions();
        setTodaySessions(getTodaySessions());
      }
    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert(t("error.mic_failed", language));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTryAgain = () => {
    setRecordedAudio(null);
    setFeedback([]);
    setAnalysisCompleted(false);
    setIsRecording(false);
  };

  const handleChangePiece = () => {
    resetSteps2And3();
    setSelectedPiece(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);
    // Clean up blob URL if exists
    if (uploadedFileUrl && uploadedFileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
  };

  const handleRetryMic = async () => {
    setMicPermissionDenied(false);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setMicPermissionDenied(true);
    }
  };

  if (!user) {
    return null;
  }

  const remainingAttempts = user.subscriptionTier === "free" 
    ? Math.max(0, 5 - todaySessions)
    : null;

  // Get main issues from feedback
  const mainIssues = feedback.length > 0
    ? (() => {
        const allIssues = feedback.flatMap((f) => f.issues);
        const issueCounts: { [key: string]: number } = {};
        allIssues.forEach((issue) => {
          issueCounts[issue] = (issueCounts[issue] || 0) + 1;
        });
        return Object.entries(issueCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([issue]) => issue);
      })()
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Metronome />
      
      {/* Countdown Overlay */}
      {storeCountdown !== null && storeCountdown > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50" style={{ paddingTop: "20vh" }}>
          <div className="text-center">
            <div 
              className="font-bold text-orange-500" 
              style={{ 
                fontSize: "40vh",
                lineHeight: "1",
                opacity: 0.9,
                textShadow: "0 0 20px rgba(249, 115, 22, 0.5)"
              }}
            >
              {storeCountdown}
            </div>
            <button
              onClick={handleCancelCountdown}
              className="mt-8 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              {language === "en" ? "Cancel" : "ยกเลิก"}
            </button>
          </div>
        </div>
      )}
      
      {/* Top Bar */}
      <div className="border-b border-border bg-background px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold">{selectedPiece.title}</h1>
              {selectedPiece.composer && (
                <p className="text-sm text-muted">{selectedPiece.composer}</p>
              )}
            </div>
            <div className="text-sm text-muted">•</div>
            <div className="text-sm text-muted">Violin</div>
            {remainingAttempts !== null && (
              <>
                <div className="text-sm text-muted">•</div>
                <div className="text-sm text-muted">
                  {language === "en" 
                    ? `${remainingAttempts} attempts left today`
                    : `เหลือ ${remainingAttempts} ครั้งสำหรับวันนี้`}
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleChangePiece}
            className="rounded-lg p-2 hover:bg-accent"
            title={language === "en" ? "Change piece" : "เปลี่ยนเพลง"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Analysis Summary (if exists) */}
      {hasAnalysis && mainIssues.length > 0 && (
        <div className="border-b border-border bg-accent/30 px-6 py-3">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-medium">
              {language === "en" ? "Main issues: " : "ประเด็นหลัก: "}
              {mainIssues.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Sheet Music */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          <SheetMusicViewer
            fileUrl={activeFileUrl}
            fileType={fileType}
            feedback={feedback}
            onFileUpload={handleFileUploadDirect}
            isRecording={isRecording}
            tempo={tempo}
            timeSignature={timeSignature}
            metronomeEnabled={metronomeEnabled}
            recordingStartTime={recordingStartTimeRef.current}
            notationData={selectedPiece?.notationData}
            selectedPiece={selectedPiece}
          />
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="border-t border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-6xl">
          {micPermissionDenied && (
            <div className="mb-4 rounded-lg border border-error bg-error/10 p-3">
              <p className="mb-2 text-sm text-error">
                {t("error.mic_failed", language)}
              </p>
              <button
                onClick={handleRetryMic}
                className="rounded bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90"
              >
                {t("error.retry", language)}
              </button>
            </div>
          )}


          <div className="flex items-center justify-between gap-4">
            {/* Left: Record/Stop Button */}
            <div className="flex items-center gap-4">
              {!hasRecording ? (
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={micPermissionDenied || !hasRealMusic}
                  className={`flex items-center gap-3 rounded-lg px-8 py-4 text-lg font-semibold transition-colors ${
                    isRecording
                      ? "bg-error text-white hover:bg-error/90"
                      : "bg-success text-white hover:bg-success/90 disabled:bg-muted disabled:text-foreground disabled:cursor-not-allowed"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-6 w-6" />
                      {t("step2.stop", language)}
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6" />
                      {t("step2.start", language)}
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{t("step2.completed", language)}</span>
                </div>
              )}

              <MicIndicator
                isRecording={isRecording}
                hasPermission={!micPermissionDenied}
              />
            </div>

            {/* Center: Metronome Controls */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={metronomeEnabled}
                  onChange={(e) => setMetronomeEnabled(e.target.checked)}
                  disabled={isRecording}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{t("practice.metronome", language)}</span>
              </label>
              {metronomeEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">{t("practice.tempo", language)}:</span>
                  <input
                    type="range"
                    min={MIN_TEMPO}
                    max={MAX_TEMPO}
                    value={tempo}
                    onChange={(e) => setTempo(parseInt(e.target.value))}
                    disabled={isRecording}
                    className="w-24"
                  />
                  <span className="w-12 text-sm font-medium">{tempo}</span>
                </div>
              )}
            </div>

            {/* Right: Submit / Try Again */}
            <div className="flex items-center gap-3">
              {hasAnalysis ? (
                <button
                  onClick={handleTryAgain}
                  className="flex items-center gap-2 rounded-lg bg-foreground px-6 py-4 text-lg font-semibold text-background hover:bg-foreground/90"
                >
                  <Play className="h-5 w-5" />
                  {language === "en" ? "Try Again" : "ลองอีกครั้ง"}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!hasRecording || isAnalyzing || !hasRealMusic}
                  className="flex items-center gap-2 rounded-lg bg-foreground px-6 py-4 text-lg font-semibold text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                      {t("step2.analyzing", language)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      {language === "en" ? "Submit" : "ส่งผลการเล่น"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
