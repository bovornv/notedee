"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, Upload, Music, BarChart3, Target, Zap, Clock, RefreshCw, Sparkles, Settings, ChevronRight } from "lucide-react";
import { usePracticeStore } from "@/store/practiceStore";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { useLanguageStore } from "@/store/languageStore";
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
import { STARTER_VIOLIN_LIBRARY } from "@/lib/starterLibrary";
import { getPracticeRecommendations } from "@/lib/progressInsights";

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
    setCurrentBeat,
  } = usePracticeStore();

  const { dailyGoal, practiceMode, setPracticeMode, feedbackMode, setFeedbackMode, sessions, getWeakSpots, getMostPracticedSong } = useProgressStore();
  const { language, initialize } = useLanguageStore();

  const [recorder] = useState(() => new AudioRecorder());
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [showPieceSelector, setShowPieceSelector] = useState(false);
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [delayedMeasureFeedback, setDelayedMeasureFeedback] = useState<Map<number, NoteFeedback[]>>(new Map());
  const [analyzingMeasures, setAnalyzingMeasures] = useState<Set<number>>(new Set());
  const [measureAnalysisErrors, setMeasureAnalysisErrors] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
  }, [user, router]);

  // Set Student Mode defaults when mode changes
  useEffect(() => {
    if (!showAdvancedMode) {
      // Student Mode: calm feedback, normal practice mode
      setFeedbackMode("calm");
      setPracticeMode("normal");
    }
  }, [showAdvancedMode, setFeedbackMode, setPracticeMode]);

  // Calculate today's sessions
  const today = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter(
    (s) => new Date(s.startedAt).toISOString().split("T")[0] === today
  ).length;

  // Get personalized recommended songs based on user progress
  const getRecommendedSongs = () => {
    if (sessions.length === 0) {
      // New users: show easiest songs first
      return STARTER_VIOLIN_LIBRARY.filter(s => s.difficulty === 1).slice(0, 5);
    }

    // Get practice recommendations
    const mostPracticedSong = getMostPracticedSong();
    const weakSpots = getWeakSpots();
    const recommendation = getPracticeRecommendations(sessions, mostPracticedSong, weakSpots);
    
    // Find the recommended song in the library
    const recommendedSong = STARTER_VIOLIN_LIBRARY.find(s => s.title === recommendation.suggestedSong);
    
    // Build recommendation list: recommended song first, then similar difficulty, then others
    const recommendedList: MusicPiece[] = [];
    if (recommendedSong) {
      recommendedList.push(recommendedSong);
    }
    
    // Add songs of similar difficulty
    const recommendedDifficulty = recommendedSong?.difficulty || 1;
    const similarDifficultySongs = STARTER_VIOLIN_LIBRARY
      .filter(s => s.difficulty === recommendedDifficulty && s.id !== recommendedSong?.id)
      .slice(0, 2);
    recommendedList.push(...similarDifficultySongs);
    
    // Fill remaining slots with other songs
    const remaining = STARTER_VIOLIN_LIBRARY
      .filter(s => !recommendedList.some(r => r.id === s.id))
      .slice(0, 5 - recommendedList.length);
    recommendedList.push(...remaining);
    
    return recommendedList.slice(0, 5);
  };

  const recommendedSongs = getRecommendedSongs();

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
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
      setMeasureAnalysisErrors(new Map());
    } else {
      alert("Please select a PDF or image file");
    }
  };

  const handleSelectSong = (song: MusicPiece) => {
    setSelectedPiece(song);
    setShowPieceSelector(false);
    setShowAdvancedMode(false); // Reset to Student Mode when selecting a new song
    setHasRecorded(false);
    setRecordedAudio(null);
    setDelayedMeasureFeedback(new Map());
    setAnalyzingMeasures(new Set());
    setMeasureAnalysisErrors(new Map());
    // Stay on /practice page - don't navigate away
  };

  // Handle countdown and start recording
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const startActualRecording = async () => {
        try {
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
          setCurrentBeat(0);
        } catch (error: any) {
          console.error("Microphone error:", error);
          setMicPermissionDenied(true);
          setIsRecording(false);
          setCountdown(null);
          
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            alert("Microphone access denied. Please allow microphone access in your browser.");
          } else {
            alert("Cannot access microphone. Please check your settings.");
          }
          setDelayedMeasureFeedback(new Map());
          setAnalyzingMeasures(new Set());
        }
      };
      startActualRecording();
    }
  }, [countdown, recorder, setCountdown, setIsRecording, setMicPermissionDenied, setHasRecorded, setRecordedAudio]);

  const handleStartRecording = async () => {
    if (!selectedPiece) {
      alert("Please select a song first");
      return;
    }

    const sessionCheck = canStartSession(user);
    if (!sessionCheck.allowed) {
      alert(sessionCheck.reason || "Cannot start practice session");
      return;
    }

    setCountdown(3);
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await recorder.stop();
      setIsRecording(false);
      setRecordedAudio(audioBlob);
      setHasRecorded(true);
      setCurrentBeat(0);
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
    } catch (error) {
      console.error("Error stopping recording:", error);
      alert("Error stopping recording");
      setIsRecording(false);
      setCurrentBeat(0);
      setDelayedMeasureFeedback(new Map());
      setAnalyzingMeasures(new Set());
    }
  };

  const expectedNotesRef = useRef<Array<{ bar: number; noteIndex: number; note: string; time: number }>>([]);
  
  useEffect(() => {
    if (selectedPiece && tempo) {
      extractExpectedNotes(selectedPiece, tempo, 20).then((notes) => {
        expectedNotesRef.current = notes;
      });
    }
  }, [selectedPiece, tempo]);

  // Set up measure-level feedback monitoring for Practice Mode
  useEffect(() => {
    if (!isRecording || feedbackMode !== "practice" || !recordingStartTime || !selectedPiece) {
      setAnalyzingMeasures(new Set());
      return;
    }

    const actualTimeSignature = selectedPiece.notationData?.timeSignature || { numerator: 4, denominator: 4 };
    const beatsPerMeasure = actualTimeSignature.numerator;
    const secondsPerBeat = 60 / tempo;
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat;

    let lastTempo = tempo;
    let tempoChangeTime = recordingStartTime;
    let accumulatedTimeBeforeTempoChange = 0;

    const recalculateBoundaries = () => {
      if (!selectedPiece.notationData) return null;
      
      const boundaries = calculateMeasureBoundaries(selectedPiece.notationData, tempo);
      
      if (lastTempo !== tempo && tempoChangeTime !== recordingStartTime) {
        const timeAtChange = (tempoChangeTime - recordingStartTime) / 1000;
        const tempoRatio = lastTempo / tempo;
        
        return boundaries.map((boundary) => {
          if (boundary.startTime > timeAtChange) {
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

      if (lastTempo !== tempo) {
        tempoChangeTime = Date.now();
        accumulatedTimeBeforeTempoChange += (tempoChangeTime - lastCheckTime) / 1000;
        measureBoundaries = recalculateBoundaries();
        lastTempo = tempo;
      }

      const now = Date.now();
      const elapsedSeconds = (now - recordingStartTime) / 1000;

      let expectedMeasure: number;
      let measureStart: number;
      let measureEnd: number;

      if (measureBoundaries && measureBoundaries.length > 0) {
        const currentBoundary = measureBoundaries.find(
          (boundary) => elapsedSeconds >= boundary.startTime && elapsedSeconds < boundary.endTime
        );
        
        if (currentBoundary) {
          expectedMeasure = currentBoundary.measureNumber;
          measureStart = currentBoundary.startTime;
          measureEnd = currentBoundary.endTime;
        } else {
          const currentSecondsPerMeasure = beatsPerMeasure * (60 / tempo);
          expectedMeasure = Math.floor(elapsedSeconds / currentSecondsPerMeasure) + 1;
          measureStart = (expectedMeasure - 1) * currentSecondsPerMeasure;
          measureEnd = measureStart + currentSecondsPerMeasure;
        }
      } else {
        const currentSecondsPerMeasure = beatsPerMeasure * (60 / tempo);
        expectedMeasure = Math.floor(elapsedSeconds / currentSecondsPerMeasure) + 1;
        measureStart = (expectedMeasure - 1) * currentSecondsPerMeasure;
        measureEnd = measureStart + currentSecondsPerMeasure;
      }

      if (expectedMeasure > currentMeasure && !processedMeasures.has(currentMeasure - 1)) {
        const measureToAnalyze = currentMeasure - 1;
        processedMeasures.add(measureToAnalyze);
        
        setAnalyzingMeasures((prev) => {
          const newSet = new Set(prev);
          newSet.add(measureToAnalyze);
          return newSet;
        });

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

        setTimeout(async () => {
          try {
            const audioBuffer = await recorder.getAudioBufferForRange(actualMeasureStart, actualMeasureEnd);
            if (audioBuffer && audioBuffer.length > 0) {
              const result = await analyzeMeasure(
                audioBuffer,
                measureToAnalyze,
                actualMeasureStart,
                actualMeasureEnd - actualMeasureStart,
                expectedNotesRef.current
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
        }, 200);

        currentMeasure = expectedMeasure;
      }

      lastCheckTime = now;
    };

    intervalId = setInterval(checkMeasureCompletion, 100);

    return () => {
      if (intervalId) clearInterval(intervalId);
      setAnalyzingMeasures(new Set());
      setMeasureAnalysisErrors(new Map());
    };
  }, [isRecording, feedbackMode, recordingStartTime, tempo, recorder, selectedPiece]);

  const handleAnalyze = async () => {
    if (!recordedAudio || !selectedPiece) {
      alert("No recorded audio");
      return;
    }

    setIsAnalyzing(true);

    try {
      const audioBuffer = await recorder.getAudioBuffer(recordedAudio);
      const expectedNotes = await extractExpectedNotes(selectedPiece, tempo);
      const result = await analyzeAudio(audioBuffer, expectedNotes);
      setFeedback(result.feedback);

      if (user?.subscriptionTier === "free") {
        incrementTodaySessions();
      }

      router.push("/results");
    } catch (error) {
      console.error("Error analyzing audio:", error);
      alert("Error analyzing audio");
    } finally {
      setIsAnalyzing(false);
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

  const fileType =
    selectedPiece?.fileUrl.endsWith(".pdf") ||
    uploadedFile?.type === "application/pdf"
      ? "pdf"
      : "image";

  // Show initial selection screen if no piece selected
  if (!selectedPiece && !isRecording && !hasRecorded) {
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
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
                  !showAdvancedMode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>{t("practice.student_mode", language)}</span>
                </div>
              </button>
              <button
                onClick={() => setShowAdvancedMode(true)}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
                  showAdvancedMode
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{t("practice.advanced_mode", language)}</span>
                </div>
              </button>
            </div>

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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSong(song);
                          }}
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

  // Show practice interface when piece is selected
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <Metronome />
      <Countdown count={countdown} onComplete={() => {}} />
      <RecordingIndicator isRecording={isRecording} />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Compact Header */}
          <div className="border-b border-border bg-accent px-4 py-1.5">
            <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h1 className="text-sm font-semibold truncate">
                  {selectedPiece ? selectedPiece.title : t("practice.select_piece")}
                </h1>
                {selectedPiece && (
                  <button
                    onClick={() => {
                      setSelectedPiece(null);
                      setHasRecorded(false);
                      setRecordedAudio(null);
                      setDelayedMeasureFeedback(new Map());
                      setAnalyzingMeasures(new Set());
                      setMeasureAnalysisErrors(new Map());
                      setShowAdvancedMode(false);
                    }}
                    disabled={isRecording || countdown !== null}
                    className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="Change song"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t("practice.change", language)}</span>
                  </button>
                )}
              </div>
              
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

          {/* Advanced Mode Settings (only shown in Advanced Mode) */}
          {showAdvancedMode && (
            <div className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-background px-4 py-1.5">
              <div className="mx-auto max-w-4xl flex items-center gap-4 flex-wrap">
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

                <div className="h-4 w-px bg-border" />

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
          )}

          {/* Recording Status Message */}
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
                key={selectedPiece.id}
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
                selectedPiece={selectedPiece}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Music className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("practice.select_piece")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="border-t border-border bg-accent px-6 py-4">
            <div className="mx-auto max-w-4xl">
              {/* Mic Permission Error */}
              {micPermissionDenied && (
                <div className="mb-4 rounded-lg border border-error bg-error/10 p-4">
                  <p className="mb-2 text-sm text-error">
                    Cannot access microphone
                  </p>
                  <button
                    onClick={handleRetryMic}
                    className="rounded bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90"
                  >
                    Try Again
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
                      {isAnalyzing ? "Analyzing..." : "View Results"}
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
