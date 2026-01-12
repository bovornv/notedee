"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { NoteFeedback, MusicPiece } from "@/types";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { isStarterSong } from "@/lib/starterLibrary";
import { extractExpectedNotes } from "@/lib/notationParser";
import { usePracticeStore } from "@/store/practiceStore";
import { loadPieceMusicXML, hasMusicXMLSupport } from "@/lib/musicxmlLoader";
import { MusicXMLNotation, RenderedNote } from "@/types/musicxml";
import { calculateNoteBoundingBoxes } from "@/lib/musicxmlRenderer";

if (typeof window !== "undefined") {
  // Use local worker file from public directory (more reliable than CDN)
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-worker/pdf.worker.min.mjs";
}

interface SheetMusicViewerProps {
  fileUrl: string | null;
  fileType: "pdf" | "image";
  feedback?: NoteFeedback[];
  onFileUpload?: (file: File) => void;
  isRecording?: boolean;
  tempo?: number;
  timeSignature?: { numerator: number; denominator: number };
  metronomeEnabled?: boolean;
  recordingStartTime?: number | null;
  notationData?: MusicPiece["notationData"]; // Structured notation if available
  feedbackMode?: "calm" | "practice"; // Feedback intensity mode
  selectedPiece?: MusicPiece | null; // Pass selected piece to check if it's a starter song
  delayedMeasureFeedback?: Map<number, NoteFeedback[]>; // Delayed feedback for completed measures (Practice Mode)
  analyzingMeasures?: Set<number>; // Measures currently being analyzed (for loading indicator)
  measureAnalysisErrors?: Map<number, string>; // Error messages for failed measure analyses
}

export default function SheetMusicViewer({
  fileUrl,
  fileType,
  feedback = [],
  onFileUpload,
  isRecording = false,
  tempo = 120,
  timeSignature = { numerator: 4, denominator: 4 },
  metronomeEnabled = false,
  recordingStartTime = null,
  notationData,
  feedbackMode = "calm",
  selectedPiece = null,
  delayedMeasureFeedback = new Map(),
  analyzingMeasures = new Set(),
  measureAnalysisErrors = new Map(),
}: SheetMusicViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfPageRef = useRef<any>(null); // Store PDF page for redrawing
  const imageRef = useRef<HTMLImageElement | null>(null); // Store image for redrawing
  const renderTaskRef = useRef<any>(null); // Track current PDF render task to cancel if needed
  const loadingTaskRef = useRef<any>(null); // Track PDF loading task to cancel if needed
  const isLoadingRef = useRef(false); // Prevent multiple simultaneous loads
  const loadingStartTimeRef = useRef<number>(0); // Track when loading started to detect stuck loads
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true); // Default to fit-to-width for better display
  const scrollPositionRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll state
  const autoScrollEnabled = isRecording && recordingStartTime !== null;
  const systemHeightRef = useRef<number>(250); // Typical system height in pixels
  const canvasHeightRef = useRef<number>(0);
  const scrollAnimationRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const [playheadPosition, setPlayheadPosition] = useState<number>(0); // 0-100% across canvas width
  const currentScaleRef = useRef<number>(2.0); // Track current canvas scale for note sizing
  const currentSystemRef = useRef<number>(0); // Track current system (staff line) being played
  const measureTimestampsRef = useRef<Map<number, number>>(new Map()); // Track when measures were added for fade-in
  const musicFrameRef = useRef<{ left: number; right: number; top: number; bottom: number } | null>(null); // Track music frame bounds
  const expectedNotesRef = useRef<Array<{ bar: number; noteIndex: number; note: string; time: number }>>([]); // Track expected notes for ticker positioning
  const musicXMLRef = useRef<MusicXMLNotation | null>(null); // MusicXML data (single source of truth)
  const renderedNotesRef = useRef<Map<string, { x: number; y: number; width: number; height: number; centerX: number }>>(new Map()); // Note bounding boxes
  const lastVisibleNoteRef = useRef<number>(-1); // Track last visible note index for scroll control
  const currentNoteIndexRef = useRef<number>(0); // Track current note being played (note-by-note)
  const scrollPendingRef = useRef<boolean>(false); // Track if scroll is pending (waiting for last visible note to complete)
  const lastBeatRef = useRef<number>(-1); // Track last beat number to update ticker only on beat boundaries
  const layoutStableRef = useRef<boolean>(false); // Track if layout is stable (no zoom/scroll in progress)
  const lastTickerXRef = useRef<number>(-1); // Track last ticker X position to prevent jumps
  
  // Get current beat from metronome (single source of truth)
  const { currentBeat } = usePracticeStore();
  
  // Determine scroll mode: Mode A (structured) or Mode B (measure-based)
  const hasStructuredNotation = !!notationData && notationData.measures.length > 0;
  const beatsPerMeasure = timeSignature.numerator;
  
  // Estimate system height based on canvas dimensions
  // Typical sheet music: 4-6 systems per page, each ~200-300px
  useEffect(() => {
    if (canvasRef.current && !loading) {
      const canvasHeight = canvasRef.current.height;
      canvasHeightRef.current = canvasHeight;
      // Estimate: assume 4-5 systems per page
      const estimatedSystems = 4.5;
      systemHeightRef.current = canvasHeight / estimatedSystems;
      
      // Mark layout as stable after a short delay (prevents race conditions)
      layoutStableRef.current = false;
      const stabilityTimer = setTimeout(() => {
        layoutStableRef.current = true;
      }, 150);
      
      return () => clearTimeout(stabilityTimer);
    } else {
      layoutStableRef.current = false;
    }
  }, [loading, canvasRef.current?.height, zoom, fitToWidth]);

  // Load MusicXML when piece changes (single source of truth)
  useEffect(() => {
    if (selectedPiece) {
      loadPieceMusicXML(selectedPiece).then((musicXML) => {
        musicXMLRef.current = musicXML;
        if (musicXML && tempo) {
          // Extract expected notes from MusicXML
          extractExpectedNotes(selectedPiece, tempo).then((notes) => {
            expectedNotesRef.current = notes;
            currentNoteIndexRef.current = 0;
            lastVisibleNoteRef.current = -1;
            scrollPendingRef.current = false;
            currentSystemRef.current = 0;
          });
        }
      });
    } else {
      musicXMLRef.current = null;
      expectedNotesRef.current = [];
    }
  }, [selectedPiece, tempo]);

  // Calculate note visual position within music frame based on timing
  // Maps note timing to actual visual position respecting measure boundaries
  const calculateNotePosition = useCallback((
    noteTime: number,
    musicFrame: { left: number; right: number; top: number; bottom: number },
    totalDuration: number
  ): number => {
    if (totalDuration === 0) return musicFrame.left;
    const progress = Math.min(1, Math.max(0, noteTime / totalDuration));
    const musicFrameWidth = musicFrame.right - musicFrame.left;
    return musicFrame.left + (progress * musicFrameWidth);
  }, []);

  // Find current note index based on elapsed time
  // Returns the note index that should currently be playing
  // Respects metronome timing - doesn't skip beats
  const findCurrentNoteIndex = useCallback((
    elapsedSeconds: number,
    notes: Array<{ bar: number; noteIndex: number; note: string; time: number }>
  ): number => {
    if (notes.length === 0) return 0;
    
    // Find the note that should be playing based on timing
    // Use <= for next note to ensure we stay on current note until it's time to move
    for (let i = 0; i < notes.length - 1; i++) {
      const currentNote = notes[i];
      const nextNote = notes[i + 1];
      
      // If elapsed time is at or past current note but before next note, return current note index
      if (elapsedSeconds >= currentNote.time && elapsedSeconds < nextNote.time) {
        return i;
      }
    }
    
    // If past all notes, return last note index
    if (elapsedSeconds >= notes[notes.length - 1].time) {
      return notes.length - 1;
    }
    
    return 0; // Before first note
  }, []);

  // Determine which notes are visible on screen based on scroll position
  // Returns array of note indices that are currently visible
  const getVisibleNotes = useCallback((
    container: HTMLDivElement,
    canvasHeight: number,
    musicFrame: { left: number; right: number; top: number; bottom: number },
    notes: Array<{ bar: number; noteIndex: number; note: string; time: number }>,
    totalDuration: number
  ): number[] => {
    if (notes.length === 0 || totalDuration === 0) return [];
    
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + viewportHeight;
    
    // Calculate vertical bounds of visible area
    const visibleNotes: number[] = [];
    
    notes.forEach((note, index) => {
      const noteX = calculateNotePosition(note.time, musicFrame, totalDuration);
      
      // Check if note is horizontally within music frame
      if (noteX >= musicFrame.left && noteX <= musicFrame.right) {
        // Estimate note Y position based on measure (simplified)
        // In production, would use actual note Y positions from OCR
        const estimatedSystem = Math.floor((note.time / totalDuration) * (canvasHeight / systemHeightRef.current));
        const estimatedY = estimatedSystem * systemHeightRef.current;
        
        // Check if estimated Y is within viewport
        if (estimatedY >= viewportTop && estimatedY <= viewportBottom) {
          visibleNotes.push(index);
        }
      }
    });
    
    return visibleNotes;
  }, [calculateNotePosition]);

  // Detect music frame bounds (where actual staff/notes are on the canvas)
  // Estimates based on typical sheet music layout
  const detectMusicFrame = useCallback((
    width: number,
    height: number
  ): { left: number; right: number; top: number; bottom: number } => {
    // Typical sheet music margins:
    // - Left margin: ~10-15% of width (for clef, key signature, time signature)
    // - Right margin: ~5-10% of width
    // - Top margin: ~5-10% of height
    // - Bottom margin: ~5-10% of height
    
    const leftMargin = width * 0.12; // 12% left margin
    const rightMargin = width * 0.08; // 8% right margin
    const topMargin = height * 0.08; // 8% top margin
    const bottomMargin = height * 0.08; // 8% bottom margin
    
    return {
      left: leftMargin,
      right: width - rightMargin,
      top: topMargin,
      bottom: height - bottomMargin,
    };
  }, []);

  // Draw STABLE ticker - anchored to canvas coordinates, never jumps
  // Updates smoothly but synchronized to beat boundaries
  // Single coordinate system: canvas coordinates only
  const drawLiveGuidance = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentPosition: number,
    scale: number
  ) => {
    // CRITICAL: Only show during live recording, NEVER during analysis
    if (!isRecording || feedback.length > 0) return;

    // Get stable music frame bounds (recalculate to prevent coordinate drift)
    const musicFrame = musicFrameRef.current || detectMusicFrame(width, height);
    if (!musicFrame) return;
    
    const musicFrameWidth = musicFrame.right - musicFrame.left;
    
    // Calculate ticker position from playheadPosition (0-100%)
    // Position updates smoothly but is driven by beat-synchronized timing
    const positionInFrame = Math.max(0, Math.min(100, currentPosition));
    const playheadX = musicFrame.left + (positionInFrame / 100) * musicFrameWidth;
    
    // SAFETY: Clamp to music frame bounds (prevent leaving visible area)
    const clampedPlayheadX = Math.max(musicFrame.left, Math.min(musicFrame.right, playheadX));
    
    // Calculate vertical position: use current system from scroll tracking
    const musicFrameHeight = musicFrame.bottom - musicFrame.top;
    const systemsPerPage = Math.ceil(musicFrameHeight / systemHeightRef.current) || 4;
    const systemHeight = musicFrameHeight / systemsPerPage;
    
    // Draw indicator on the current active system
    const activeSystem = Math.max(0, Math.min(currentSystemRef.current || 0, systemsPerPage - 1));
    const systemTop = musicFrame.top + (activeSystem * systemHeight);
    const systemBottom = musicFrame.top + ((activeSystem + 1) * systemHeight);
    const staffCenterY = systemTop + (systemBottom - systemTop) * 0.5;
    
    // Only draw if ticker is within visible music frame
    if (clampedPlayheadX >= musicFrame.left && clampedPlayheadX <= musicFrame.right && 
        staffCenterY >= musicFrame.top && staffCenterY <= musicFrame.bottom) {
      
      // RED TICKER - More visible and thicker
      const baseColor = "rgba(239, 68, 68, 0.8)";
      
      // Calculate note head size based on scale
      const baseNoteSize = 3.5;
      const noteHeadRadius = Math.max(3.5, (baseNoteSize * scale) / 2);
      
      const guideLineHeight = systemHeight * 0.4;
      
      context.save();
      context.globalAlpha = 0.8;
      context.fillStyle = baseColor;
      context.strokeStyle = baseColor;
      
      // Draw ticker circle - RED and thicker
      context.beginPath();
      context.arc(clampedPlayheadX, staffCenterY, noteHeadRadius, 0, Math.PI * 2);
      context.fill();
      
      // Draw thicker vertical guide line - RED
      context.lineWidth = Math.max(2.5, scale * 0.8);
      context.beginPath();
      const lineTop = Math.max(musicFrame.top, staffCenterY - guideLineHeight / 2);
      const lineBottom = Math.min(musicFrame.bottom, staffCenterY + guideLineHeight / 2);
      context.moveTo(clampedPlayheadX, lineTop);
      context.lineTo(clampedPlayheadX, lineBottom);
      context.stroke();
      
      context.restore();
    }
  }, [isRecording, feedback.length, feedbackMode, detectMusicFrame]);

  // Draw measure boundary lines ONLY when we have proper structured notation data
  // Hide boundaries for uploaded PDFs/images without parsed notation data
  // Boundaries are drawn WITHIN the music frame (staff/notes area)
  const drawMeasureBoundaries = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number
  ) => {
    // CRITICAL: Only show boundaries when we have structured notation data with actual measure positions
    // Don't show estimated boundaries for uploaded files without proper parsing
    if (!notationData || !notationData.measures.length) return;
    
    // Only show if measures have proper beat positions (not placeholder data)
    // Check if measures have meaningful beat data (not all starting at 0)
    const hasValidBeatData = notationData.measures.some((m, i) => 
      i === 0 || m.startBeat > notationData.measures[i - 1].startBeat
    );
    
    if (!hasValidBeatData) return; // Don't show boundaries for placeholder data
    
    // Get music frame bounds (where actual notes are)
    const musicFrame = musicFrameRef.current || detectMusicFrame(width, height);
    const musicFrameWidth = musicFrame.right - musicFrame.left;
    
    // Calculate measure boundaries based on tempo
    const secondsPerBeat = 60 / tempo;
    const totalBeats = notationData.totalBeats || notationData.measures.reduce((sum, m) => sum + m.duration, 0);
    
    // Draw subtle vertical lines for each measure boundary WITHIN music frame
    notationData.measures.forEach((measure, index) => {
      // Calculate horizontal position based on beat position
      const measureStartBeat = measure.startBeat;
      
      // Convert beat positions to position within music frame (0-100% of music frame width)
      const startXPercent = (measureStartBeat / totalBeats) * 100;
      const startX = musicFrame.left + (startXPercent / 100) * musicFrameWidth;
      
      // Only draw if position is valid and within music frame bounds
      if (startX < musicFrame.left || startX > musicFrame.right) return;
      
      // Draw measure start line (subtle, like a staff line) WITHIN music frame
      if (index > 0) { // Don't draw line at the very start
        context.save();
        context.strokeStyle = "rgba(200, 200, 200, 0.3)"; // Very subtle gray
        context.lineWidth = Math.max(0.5, scale * 0.3); // Thin line, scales with zoom
        context.setLineDash([2, 2]); // Dashed line for subtlety
        context.beginPath();
        context.moveTo(startX, musicFrame.top);
        context.lineTo(startX, musicFrame.bottom);
        context.stroke();
        context.restore();
      }
      
      // Only draw measure numbers for first few measures and only if we have valid data
      // Position numbers within music frame
      if (index < 8 && hasValidBeatData) {
        context.save();
        context.fillStyle = "rgba(150, 150, 150, 0.4)";
        context.font = `${Math.max(8, 10 * scale)}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(`${measure.measureNumber}`, startX + 2, musicFrame.top + 5);
        context.restore();
      }
    });
  }, [notationData, tempo, detectMusicFrame]);

  // Draw delayed measure-level feedback during recording (Practice Mode only)
  // Shows feedback for completed measures with a delay after measure ends
  const drawDelayedMeasureFeedback = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Only show in Practice Mode during recording
    if (feedbackMode !== "practice" || !isRecording) return;

    // Group delayed feedback by bar
    const feedbackByBar: Record<number, NoteFeedback[]> = {};
    delayedMeasureFeedback.forEach((notes, measureNumber) => {
      notes.forEach((note) => {
        if (!feedbackByBar[note.bar]) feedbackByBar[note.bar] = [];
        feedbackByBar[note.bar].push(note);
      });
    });

    // Calculate total measures (use max of feedback bars or analyzing measures)
    const allMeasures = new Set([
      ...Object.keys(feedbackByBar).map(Number),
      ...Array.from(analyzingMeasures),
    ]);
    const totalBars = Math.max(allMeasures.size, 1);
    const barWidth = width / totalBars;

    // Draw loading indicator for measures being analyzed
    analyzingMeasures.forEach((measureNumber) => {
      if (!delayedMeasureFeedback.has(measureNumber)) {
        const x = (measureNumber - 1) * barWidth;
        // Smooth pulse animation (slower, calmer)
        const pulseOpacity = 0.25 + Math.sin(Date.now() / 800) * 0.15;
        
        context.save();
        // Subtle gray-blue background with pulse
        context.fillStyle = `rgba(100, 116, 139, ${pulseOpacity})`;
        context.fillRect(x, 0, barWidth, height);
        
        // Draw "Analyzing..." text with better positioning
        context.fillStyle = "rgba(55, 53, 47, 0.7)";
        context.font = "11px sans-serif";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText("Analyzing...", x + 8, 20);
        context.restore();
      }
    });

    // Draw colored overlays for completed measures with smooth fade-in
    Object.entries(feedbackByBar).forEach(([barStr, notes]) => {
      const bar = parseInt(barStr);
      const x = (bar - 1) * barWidth;

      // Track when this measure was first added for fade-in animation
      if (!measureTimestampsRef.current.has(bar)) {
        measureTimestampsRef.current.set(bar, Date.now());
      }
      const addedAt = measureTimestampsRef.current.get(bar) || Date.now();
      const fadeInDuration = 400; // 400ms fade-in
      const elapsed = Date.now() - addedAt;
      const fadeProgress = Math.min(1, elapsed / fadeInDuration);
      const fadeAlpha = 0.3 + (fadeProgress * 0.55); // Fade from 30% to 85% opacity

      // Determine bar color based on worst accuracy in bar
      const worstAccuracy = notes.reduce((worst, note) => {
        if (note.accuracy === "wrong") return "wrong";
        if (note.accuracy === "slightly_off" && worst !== "wrong")
          return "slightly_off";
        return worst;
      }, "correct" as NoteFeedback["accuracy"]);

      // Supportive color palette - clear but not alarming
      const colors = {
        correct: "rgba(34, 197, 94, 0.2)", // Softer green - encouraging
        slightly_off: "rgba(234, 179, 8, 0.2)", // Softer yellow - supportive
        wrong: "rgba(239, 68, 68, 0.15)", // Softer red - gentle guidance
      };

      // Draw subtle overlay for completed measure with smooth fade-in effect
      context.save();
      context.globalAlpha = fadeAlpha;
      context.fillStyle = colors[worstAccuracy];
      context.fillRect(x, 0, barWidth, height);
      context.restore();

      // Draw measure number with gentle styling and fade-in
      if (worstAccuracy !== "correct") {
        context.save();
        context.globalAlpha = 0.5 + (fadeProgress * 0.25); // Fade text in too
        context.fillStyle = "rgba(55, 53, 47, 0.75)";
        context.font = "12px sans-serif";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(`Measure ${bar}`, x + 8, 20);
        context.restore();
      }
    });

    // Draw error messages for failed analyses (non-intrusive, subtle)
    measureAnalysisErrors.forEach((errorMessage, measureNumber) => {
      const x = (measureNumber - 1) * barWidth;
      context.save();
      context.globalAlpha = 0.4;
      context.fillStyle = "rgba(156, 163, 175, 0.3)"; // Subtle gray
      context.fillRect(x, 0, barWidth, height);
      context.restore();
      
      // Draw subtle error indicator
      context.save();
      context.globalAlpha = 0.5;
      context.fillStyle = "rgba(107, 114, 128, 0.6)";
      context.font = "10px sans-serif";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText("—", x + 8, 22); // Simple dash indicator
      context.restore();
    });
  }, [feedbackMode, isRecording, delayedMeasureFeedback, analyzingMeasures, measureAnalysisErrors]);

  // Draw detailed feedback after performance (post-performance analysis)
  // This is where learning and correction happen - after the student finishes playing
  // Philosophy: Supportive, clear, teacher-like feedback
  const drawFeedback = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Only show feedback after recording is complete
    // Never show during live performance - that's when guidance happens
    if (feedback.length === 0 || isRecording) return;

    // Group feedback by bar for measure-level insights
    const feedbackByBar = feedback.reduce((acc, f) => {
      if (!acc[f.bar]) acc[f.bar] = [];
      acc[f.bar].push(f);
      return acc;
    }, {} as Record<number, NoteFeedback[]>);

    // Draw colored overlays for each bar
    // Colors are supportive, not harsh - like a teacher's gentle feedback
    Object.entries(feedbackByBar).forEach(([barStr, notes]) => {
      const bar = parseInt(barStr);
      const barWidth = width / Math.max(Object.keys(feedbackByBar).length, 1);
      const x = (bar - 1) * barWidth;

      // Determine bar color based on worst accuracy in bar
      const worstAccuracy = notes.reduce((worst, note) => {
        if (note.accuracy === "wrong") return "wrong";
        if (note.accuracy === "slightly_off" && worst !== "wrong")
          return "slightly_off";
        return worst;
      }, "correct" as NoteFeedback["accuracy"]);

      // Supportive color palette - clear but not alarming
      // Green: "Great work!" Yellow: "Almost there!" Red: "Let's practice this"
      const colors = {
        correct: "rgba(34, 197, 94, 0.15)", // Softer green - encouraging
        slightly_off: "rgba(234, 179, 8, 0.15)", // Softer yellow - supportive
        wrong: "rgba(239, 68, 68, 0.12)", // Softer red - gentle guidance
      };

      // Draw subtle overlay - not overwhelming
      context.fillStyle = colors[worstAccuracy];
      context.fillRect(x, 0, barWidth, height);

      // Draw bar number with gentle styling
      // Only show for bars that need attention (not perfect bars)
      if (worstAccuracy !== "correct") {
        context.fillStyle = "rgba(55, 53, 47, 0.6)"; // Soft dark gray
        context.font = "14px sans-serif";
        context.fillText(`Measure ${bar}`, x + 8, 24);
      }
    });
  }, [feedback, isRecording]);

  const loadPDF = useCallback(async () => {
    if (!fileUrl) {
      setError("NO_FILE");
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous loads
    // But if we're stuck in loading state for more than 10 seconds, allow retry
    if (isLoadingRef.current) {
      const timeSinceStart = Date.now() - loadingStartTimeRef.current;
      if (timeSinceStart < 10000) {
        return; // Still within timeout, prevent duplicate load
      }
      // Loading has been stuck for too long, clear and retry
      console.warn("PDF loading appears stuck, clearing state and retrying");
      isLoadingRef.current = false;
      setLoading(false);
    }

    try {
      // CRITICAL: Cancel any pending render task first
      // This is safe and prevents concurrent renders on the same canvas
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors (task may already be complete)
        }
        renderTaskRef.current = null;
      }

      // CRITICAL: DO NOT destroy loading task here
      // Destroying the loading task destroys the shared PDF.js worker
      // This breaks any active render operations and causes "Worker was destroyed" errors
      // Instead, let the loading task complete naturally or be garbage collected
      // Only clear the reference so we can start a new load
      if (loadingTaskRef.current) {
        // Don't destroy - just clear reference
        // The task will complete or be garbage collected naturally
        loadingTaskRef.current = null;
      }

      isLoadingRef.current = true;
      loadingStartTimeRef.current = Date.now();
      setLoading(true);
      setError(null);

      // Handle blob URLs - PDF.js needs ArrayBuffer for blob URLs
      let pdfData: string | ArrayBuffer = fileUrl;
      
      if (fileUrl.startsWith("blob:")) {
        try {
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          pdfData = arrayBuffer;
        } catch (fetchError) {
          console.error("Error fetching blob:", fetchError);
          setError("FILE_NOT_FOUND");
          setLoading(false);
          isLoadingRef.current = false;
          return;
        }
      } else {
        // For regular URLs (like /sheet-music/*.pdf), try to load directly
        // Don't check HEAD first as it may fail due to CORS or server config
        // PDF.js will handle the error if the file doesn't exist
      }

      const loadingTask = pdfjsLib.getDocument({
        data: pdfData instanceof ArrayBuffer ? pdfData : undefined,
        url: typeof pdfData === "string" ? pdfData : undefined,
        withCredentials: false,
        httpHeaders: {},
        verbosity: 0, // Reduce console noise
      });
      
      loadingTaskRef.current = loadingTask;
      
      // Add progress callback for debugging
      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        if (progress.total > 0) {
          console.log(`PDF loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
      };
      
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      pdfPageRef.current = page; // Store for redrawing
      console.log(`PDF loaded: ${fileUrl}, page rotation: ${page.rotate || 0} degrees`);

      // Get page rotation from PDF metadata
      // PDF.js page.rotate can be 0, 90, 180, or 270
      const pageRotation = page.rotate || 0;
      
      // PDFs appear to be stored upside down, so we need to rotate them 180 degrees
      // PDF.js rotation is applied relative to the page's natural orientation
      // If pageRotation is 0 but PDF appears upside down, we need rotation: 180
      // If pageRotation is 180, we need rotation: 0 to cancel it (but if still upside down, try 180)
      // Simplest: always rotate 180 degrees to fix upside-down PDFs
      const correctedRotation = 180;
      
      // Calculate scale based on fit-to-width or zoom
      // Default to fit-to-width for better display
      const baseViewport = page.getViewport({ scale: 1.0, rotation: correctedRotation });
      let scale = 2.0;
      let targetCanvasWidth: number | null = null;
      
      if (fitToWidth && containerRef.current) {
        targetCanvasWidth = containerRef.current.clientWidth - 40; // Account for padding
        scale = Math.min(targetCanvasWidth / baseViewport.width, 3.0);
      } else {
        scale = 2.0 * zoom;
      }

      // Ensure PDF is rendered with corrected rotation (right-side up)
      const viewport = page.getViewport({ scale, rotation: correctedRotation });
      const canvas = canvasRef.current;
      if (!canvas) {
        setError("RENDER_ERROR");
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Set canvas dimensions - use viewport dimensions (which match the PDF scale)
      // Canvas will be styled with CSS to fill width if needed
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      currentScaleRef.current = scale; // Store scale for note sizing

      const context = canvas.getContext("2d");
      if (!context) {
        setError("RENDER_ERROR");
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Clear canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
      });
      
      renderTaskRef.current = renderTask;
      
      // Add timeout to prevent hanging (10 seconds max for render)
      const renderPromise = Promise.race([
        renderTask.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Render timeout")), 10000)
        ),
      ]);
      
      try {
        await renderPromise;
      } catch (renderErr: any) {
        if (renderErr.message === "Render timeout") {
          console.error("PDF render timed out after 10 seconds");
          renderTask.cancel();
          throw new Error("PDF rendering timed out");
        }
        throw renderErr;
      } finally {
        renderTaskRef.current = null; // Clear after render (success or failure)
      }

      // Draw live guidance during recording OR feedback after recording
      if (isRecording && feedback.length === 0) {
        drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, scale);
        // In Practice Mode, also draw delayed measure feedback
        if (feedbackMode === "practice") {
          drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
        }
      } else if (feedback.length > 0 && !isRecording) {
        drawFeedback(context, canvas.width, canvas.height);
      }
      
      // Update refs for auto-scroll
      canvasHeightRef.current = canvas.height;
      systemHeightRef.current = Math.max(200, canvas.height / 5);
      
      setLoading(false);
      setError(null); // Clear any previous errors
      isLoadingRef.current = false;
      loadingStartTimeRef.current = 0;
    } catch (err: any) {
      // Handle cancellation errors - still need to clear loading state
      if (err.name === "RenderingCancelledException" || err.message?.includes("cancelled")) {
        console.log("PDF rendering cancelled (expected during rapid updates)");
        setLoading(false);
        isLoadingRef.current = false;
        loadingStartTimeRef.current = 0;
        return;
      }

      console.error("Error loading PDF:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        fileUrl: fileUrl,
        stack: err.stack,
      });
      
      // Check if it's a file not found error or network error
      const isFileNotFound = 
        err.name === "MissingPDFException" || 
        err.name === "InvalidPDFException" ||
        err.name === "UnexpectedResponseException" ||
        err.message?.includes("404") || 
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("NetworkError") ||
        err.message?.includes("file not found") ||
        err.message?.includes("Unexpected server response") ||
        err.message?.includes("Invalid PDF") ||
        (err.message?.includes("404") && fileUrl);
      
      if (isFileNotFound) {
        // For starter songs, verify file exists - this shouldn't happen
        if (selectedPiece && isStarterSong(selectedPiece)) {
          console.error(`CRITICAL: Starter song PDF not accessible: ${fileUrl}`);
          console.error("This indicates a deployment or file serving issue.");
          // Try to verify file exists by fetching it
          try {
            const testResponse = await fetch(fileUrl);
            if (!testResponse.ok) {
              console.error(`File fetch failed with status: ${testResponse.status}`);
            } else {
              console.warn("File exists but PDF.js cannot load it. Possible CORS or worker issue.");
            }
          } catch (fetchErr) {
            console.error("File fetch test failed:", fetchErr);
          }
        }
        setError("FILE_NOT_FOUND");
      } else {
        // Other errors (rendering, parsing, etc.)
        console.error("PDF rendering error:", err);
        setError("RENDER_ERROR");
      }
      setLoading(false);
      isLoadingRef.current = false;
      loadingStartTimeRef.current = 0;
    }
  }, [fileUrl, zoom, fitToWidth, drawFeedback, drawDelayedMeasureFeedback, drawLiveGuidance, drawMeasureBoundaries, feedbackMode, isRecording, playheadPosition, feedback.length, notationData, tempo, selectedPiece]);

  const loadImage = useCallback(async () => {
    if (!fileUrl) {
      setError("NO_FILE");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const img = new Image();
      img.crossOrigin = "anonymous";
      imageRef.current = img; // Store for redrawing

      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let scale = 1;
        if (fitToWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 40;
          scale = containerWidth / img.width;
        } else {
          const maxWidth = 1200 * zoom;
          scale = Math.min(maxWidth / img.width, 1) * zoom;
        }

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        currentScaleRef.current = scale; // Store scale for note sizing

        const context = canvas.getContext("2d");
        if (!context) {
          setError("RENDER_ERROR");
          setLoading(false);
          return;
        }

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        
      // Draw live guidance during recording OR feedback after recording
      if (isRecording && feedback.length === 0) {
        drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, scale);
        // In Practice Mode, also draw delayed measure feedback
        if (feedbackMode === "practice") {
          drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
        }
      } else if (feedback.length > 0 && !isRecording) {
        drawFeedback(context, canvas.width, canvas.height);
      }
        canvasHeightRef.current = canvas.height;
        systemHeightRef.current = Math.max(200, canvas.height / 5);
        setLoading(false);
        setError(null); // Clear any previous errors
      };

      img.onerror = () => {
        setError("RENDER_ERROR");
        setLoading(false);
      };

      img.src = fileUrl;
    } catch (err) {
      console.error("Error loading image:", err);
      setError("RENDER_ERROR");
      setLoading(false);
    }
  }, [fileUrl, zoom, fitToWidth, drawFeedback, drawLiveGuidance, drawDelayedMeasureFeedback, isRecording, feedback.length, playheadPosition, feedbackMode]);

  useEffect(() => {
    console.log(`SheetMusicViewer: fileUrl changed to: ${fileUrl}, selectedPiece: ${selectedPiece?.title || 'none'}`);
    
    if (!fileUrl) {
      setError("NO_FILE");
      setLoading(false);
      // Clear PDF state when no file
      pdfPageRef.current = null;
      return;
    }

    // CRITICAL: Clear previous PDF state when fileUrl changes
    // This ensures we don't show the wrong PDF when switching songs
    console.log(`Clearing PDF state and loading new file: ${fileUrl}`);
    pdfPageRef.current = null;
    renderTaskRef.current = null;
    loadingTaskRef.current = null;
    isLoadingRef.current = false;
    loadingStartTimeRef.current = 0;
    setError(null);
    setLoading(true);
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    if (fileType === "pdf") {
      loadPDF();
    } else {
      loadImage();
    }

    // Cleanup: cancel any ongoing operations when component unmounts or dependencies change
    return () => {
      // Cancel render task (safe - prevents concurrent renders)
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors (task may already be complete)
        }
        renderTaskRef.current = null;
      }
      
      // CRITICAL: DO NOT destroy loading task in cleanup
      // Destroying the loading task destroys the shared PDF.js worker
      // This causes "Worker was destroyed" errors if React StrictMode remounts
      // The loading task will complete naturally or be garbage collected
      // Only clear the reference
      if (loadingTaskRef.current) {
        loadingTaskRef.current = null;
      }
      
      isLoadingRef.current = false;
      loadingStartTimeRef.current = 0;
    };
  }, [fileType, fileUrl, loadPDF, loadImage]);

  // Reload when zoom or fitToWidth changes (only if file exists)
  useEffect(() => {
    if (!loading && !error && fileUrl) {
      if (fileType === "pdf") {
        loadPDF();
      } else {
        loadImage();
      }
    }
  }, [zoom, fitToWidth, loading, error, fileUrl, fileType, loadPDF, loadImage]);

  // Restore scroll position after render
  useEffect(() => {
    if (containerRef.current && scrollPositionRef.current > 0) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [loading]);

  const handleScroll = useCallback(() => {
    // Disable manual scrolling during active recording/playback
    if (autoScrollEnabled && containerRef.current) {
      // Allow small manual adjustments but prevent major jumps
      const currentScroll = containerRef.current.scrollTop;
      const expectedScroll = scrollPositionRef.current;
      const scrollDiff = Math.abs(currentScroll - expectedScroll);
      
      // If user tries to scroll significantly, reset to auto-scroll position
      if (scrollDiff > 50) {
        containerRef.current.scrollTop = expectedScroll;
        return;
      }
    }
    
    if (containerRef.current && !autoScrollEnabled) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }
  }, [autoScrollEnabled]);
  
  // Reset playhead when recording stops
  useEffect(() => {
    if (!autoScrollEnabled) {
      setPlayheadPosition(0);
      currentSystemRef.current = 0;
    }
  }, [autoScrollEnabled]);

  // Redraw canvas when playhead position or delayed feedback changes during Practice Mode recording
  // This replaces the continuous animation loop which was causing crashes
  useEffect(() => {
    if (!isRecording || feedbackMode !== "practice" || feedback.length > 0 || loading || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = currentScaleRef.current;

    // Redraw the base content (PDF or image) and then overlay live guidance
    const redraw = async () => {
      if (fileType === "pdf" && pdfPageRef.current) {
        // Cancel any existing render task before starting new one
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }
        
        // Get current viewport scale - use same rotation as initial load (180 degrees to fix upside-down)
        const correctedRotation = 180;
        const baseViewport = pdfPageRef.current.getViewport({ scale: 1.0, rotation: correctedRotation });
        const currentScale = canvas.width / baseViewport.width;
        const viewport = pdfPageRef.current.getViewport({ scale: currentScale, rotation: correctedRotation });
        currentScaleRef.current = currentScale;
        
        // Clear and redraw PDF
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        const renderTask = pdfPageRef.current.render({
          canvasContext: context,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask; // Track render task
        await renderTask.promise;
        renderTaskRef.current = null; // Clear after completion
        
        // Draw measure boundaries first (if available)
        if (notationData) {
          drawMeasureBoundaries(context, canvas.width, canvas.height, currentScale);
        }
        
        // Overlay live guidance and delayed feedback
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, currentScale);
          drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
        }
      } else if (fileType === "image" && imageRef.current) {
        // Calculate scale from canvas/image dimensions
        const imageScale = canvas.width / imageRef.current.width;
        currentScaleRef.current = imageScale;
        
        // Clear and redraw image
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
        
        // Draw measure boundaries first (if available)
        if (notationData) {
          drawMeasureBoundaries(context, canvas.width, canvas.height, imageScale);
        }
        
        // Overlay live guidance and delayed feedback
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, imageScale);
          drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
        }
      }
    };

    redraw();
  }, [isRecording, feedbackMode, feedback.length, loading, fileType, playheadPosition, delayedMeasureFeedback, analyzingMeasures, measureAnalysisErrors, drawLiveGuidance, drawDelayedMeasureFeedback, drawMeasureBoundaries, notationData]);

  // Redraw canvas when playhead position changes during recording (for live guidance)
  // Note: Practice Mode is handled by the animation loop above, so this only handles Calm Mode
  useEffect(() => {
    if (!isRecording || feedback.length > 0 || loading || !canvasRef.current) return;
    if (feedbackMode === "practice") return; // Handled by animation loop above
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = currentScaleRef.current;

    // Redraw the base content (PDF or image) and then overlay live guidance
    // This only runs for Calm Mode (Practice Mode uses the animation loop)
    const redraw = async () => {
      if (fileType === "pdf" && pdfPageRef.current) {
        // Cancel any existing render task before starting new one
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Ignore cancellation errors
          }
          renderTaskRef.current = null;
        }
        
        // Get current viewport scale - use same rotation as initial load (180 degrees to fix upside-down)
        const correctedRotation = 180;
        const baseViewport = pdfPageRef.current.getViewport({ scale: 1.0, rotation: correctedRotation });
        const currentScale = canvas.width / baseViewport.width;
        const viewport = pdfPageRef.current.getViewport({ scale: currentScale, rotation: correctedRotation });
        currentScaleRef.current = currentScale;
        
        // Clear and redraw PDF
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        const renderTask = pdfPageRef.current.render({
          canvasContext: context,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask; // Track render task
        await renderTask.promise;
        renderTaskRef.current = null; // Clear after completion
        
        // Draw measure boundaries first (if available)
        if (notationData) {
          drawMeasureBoundaries(context, canvas.width, canvas.height, currentScale);
        }
        
        // Overlay live guidance with proper scale (only during recording, Calm Mode only)
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition, currentScale);
        } else if (feedback.length > 0 && !isRecording) {
          drawFeedback(context, canvas.width, canvas.height);
        }
      } else if (fileType === "image" && imageRef.current) {
        // Calculate scale from canvas/image dimensions
        const imageScale = canvas.width / imageRef.current.width;
        currentScaleRef.current = imageScale;
        
        // Clear and redraw image
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
        
        // Draw measure boundaries first (if available)
        if (notationData) {
          drawMeasureBoundaries(context, canvas.width, canvas.height, imageScale);
        }
        
        // Overlay live guidance with proper scale (only during recording, Calm Mode only)
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition, imageScale);
        } else if (feedback.length > 0 && !isRecording) {
          drawFeedback(context, canvas.width, canvas.height);
        }
      }
    };

    redraw();
  }, [playheadPosition, isRecording, feedback.length, loading, fileType, drawLiveGuidance, drawFeedback, drawMeasureBoundaries, feedbackMode, notationData, tempo]);
  
  // MUSICXML-DRIVEN TICKER: Note-by-note movement based on MusicXML timing
  // Ticker moves note-by-note, aligned to actual note positions from MusicXML
  // Auto-scroll uses MusicXML system boundaries
  useEffect(() => {
    if (!isRecording || !containerRef.current || loading || !recordingStartTime) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      if (!isRecording) {
        setPlayheadPosition(0);
        lastBeatRef.current = -1;
        lastTickerXRef.current = -1;
        currentNoteIndexRef.current = 0;
        currentSystemRef.current = 0;
        scrollPendingRef.current = false;
      }
      return;
    }

    const container = containerRef.current;
    const musicXML = musicXMLRef.current;
    const notes = expectedNotesRef.current;
    const secondsPerBeat = 60 / tempo;
    
    // Debug: Log if notes are empty
    if (notes.length === 0 && isRecording) {
      console.log("Ticker: No notes available, using fallback positioning");
    }
    
    // Get stable music frame bounds
    const getStableMusicFrame = () => {
      if (!canvasRef.current) {
        return detectMusicFrame(800, 600);
      }
      return detectMusicFrame(canvasRef.current.width, canvasRef.current.height);
    };

    // Find current note index based on beat position (MusicXML-driven)
    const findCurrentNoteIndex = (beat: number): number => {
      if (!musicXML || notes.length === 0) {
        // If no MusicXML or notes, return 0 but allow ticker to move based on time
        return 0;
      }
      
      // Convert beat to time in seconds
      const currentTime = beat * secondsPerBeat;
      
      // Find note that should be playing at this time
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteStartTime = note.time;
        const noteEndTime = i < notes.length - 1 
          ? notes[i + 1].time 
          : noteStartTime + secondsPerBeat; // Default to one beat duration
        
        if (currentTime >= noteStartTime && currentTime < noteEndTime) {
          return i;
        }
      }
      
      // If past all notes, return last note index
      return Math.max(0, notes.length - 1);
    };

    // Get current system from MusicXML
    const getCurrentSystem = (noteIndex: number): number => {
      if (!musicXML || noteIndex < 0 || noteIndex >= notes.length) return 0;
      
      const note = notes[noteIndex];
      const measure = musicXML.measures.find(m => m.measureNumber === note.bar);
      return measure ? measure.systemIndex : 0;
    };
    
    // Get rendered note bounding box for precise ticker alignment
    // Uses MusicXML data and actual PDF layout for accurate positioning
    const getRenderedNoteBounds = (noteIndex: number): RenderedNote | null => {
      if (!musicXML || noteIndex < 0 || noteIndex >= notes.length || !canvasRef.current) return null;
      
      const note = notes[noteIndex];
      
      // Find matching MusicXML note by measure and pitch
      const measure = musicXML.measures.find(m => m.measureNumber === note.bar);
      if (!measure) return null;
      
      // Find note in measure (sorted by beat position)
      const measureNotes = [...measure.notes].sort((a, b) => a.beatPosition - b.beatPosition);
      const musicXMLNote = measureNotes.find(n => n.pitch === note.note);
      if (!musicXMLNote) return null;
      
      // Get stable music frame from PDF
      const musicFrame = getStableMusicFrame();
      
      // Use MusicXML renderer to calculate precise bounding box
      const renderedNotesMap = calculateNoteBoundingBoxes(
        musicXML,
        {
          width: canvasRef.current.width,
          height: canvasRef.current.height,
          scale: currentScaleRef.current,
          staffSpacing: (musicFrame.bottom - musicFrame.top) / (musicXML.systems.length || 1),
        },
        musicFrame
      );
      
      const renderedNote = renderedNotesMap.get(musicXMLNote.id);
      if (renderedNote) {
        // Update rendered notes cache
        renderedNotesRef.current.set(musicXMLNote.id, renderedNote);
        return renderedNote;
      }
      
      // Fallback: Calculate position manually if renderer didn't find it
      const musicFrameWidth = musicFrame.right - musicFrame.left;
      const totalDuration = notes.length > 0 
        ? notes[notes.length - 1].time + secondsPerBeat * beatsPerMeasure
        : secondsPerBeat * beatsPerMeasure * 4;
      
      const noteX = calculateNotePosition(note.time, musicFrame, totalDuration);
      const noteWidth = 20 * currentScaleRef.current; // Scale note width with zoom
      const noteHeight = 15 * currentScaleRef.current; // Scale note height with zoom
      
      // Calculate system Y position
      const systemCount = musicXML.systems.length || 1;
      const systemHeight = (musicFrame.bottom - musicFrame.top) / systemCount;
      const systemY = musicFrame.top + (musicXMLNote.staffIndex * systemHeight);
      const centerY = systemY + (systemHeight / 2);
      
      const fallbackNote: RenderedNote = {
        noteId: musicXMLNote.id,
        x: noteX - noteWidth / 2,
        y: centerY - noteHeight / 2,
        width: noteWidth,
        height: noteHeight,
        centerX: noteX,
        centerY,
        systemIndex: musicXMLNote.staffIndex,
      };
      
      // Cache fallback note
      renderedNotesRef.current.set(musicXMLNote.id, fallbackNote);
      return fallbackNote;
    };

    // Check if we've completed the current system (reached last note of system)
    const isSystemComplete = (noteIndex: number): boolean => {
      if (!musicXML || noteIndex < 0 || noteIndex >= notes.length) return false;
      
      const currentSystem = getCurrentSystem(noteIndex);
      const system = musicXML.systems.find(s => s.systemIndex === currentSystem);
      if (!system) return false;
      
      // Find the last note in this system
      const systemMeasures = system.measures;
      const systemNotes = notes.filter(note => systemMeasures.includes(note.bar));
      if (systemNotes.length === 0) return false;
      
      const lastSystemNoteIndex = notes.findIndex(n => 
        n.bar === systemNotes[systemNotes.length - 1].bar &&
        n.noteIndex === systemNotes[systemNotes.length - 1].noteIndex
      );
      
      // System is complete when we've reached or passed the last note
      return noteIndex >= lastSystemNoteIndex;
    };

    // Initialize on first beat
    if (lastBeatRef.current < 0 && currentBeat > 0) {
      lastBeatRef.current = currentBeat;
      const musicFrame = getStableMusicFrame();
      musicFrameRef.current = musicFrame;
      const noteIndex = findCurrentNoteIndex(currentBeat);
      currentNoteIndexRef.current = noteIndex;
      currentSystemRef.current = getCurrentSystem(noteIndex);
      setPlayheadPosition(1); // Start visible
      if (notes.length > 0) {
        const firstNoteX = calculateNotePosition(notes[0].time, musicFrame, notes[notes.length - 1].time + secondsPerBeat * beatsPerMeasure);
        lastTickerXRef.current = firstNoteX;
      } else {
        lastTickerXRef.current = musicFrame.left;
      }
    }

    // Only update on beat changes (metronome-driven)
    if (currentBeat === lastBeatRef.current || currentBeat < 1) {
      return;
    }

    // New beat detected - update ticker position note-by-note
    lastBeatRef.current = currentBeat;
    
    const musicFrame = getStableMusicFrame();
    musicFrameRef.current = musicFrame;
    const musicFrameWidth = musicFrame.right - musicFrame.left;
    
    // Find current note index based on beat (MusicXML-driven)
    const noteIndex = findCurrentNoteIndex(currentBeat);
    
    // Update ticker position - move smoothly based on beat progress
    // Always update ticker position, even if still on same note (for smooth movement)
    if (notes.length > 0 && noteIndex < notes.length) {
      // Update current note index if changed
      if (noteIndex !== currentNoteIndexRef.current) {
        currentNoteIndexRef.current = noteIndex;
      }
      
      // Get rendered note bounding box for precise alignment
      const renderedNote = getRenderedNoteBounds(noteIndex);
      
      if (renderedNote) {
        // Use centerX from rendered note for precise ticker alignment
        lastTickerXRef.current = renderedNote.centerX;
        
        // Convert to percentage for playheadPosition
        const playheadPercent = ((renderedNote.centerX - musicFrame.left) / musicFrameWidth) * 100;
        setPlayheadPosition(Math.max(0, Math.min(100, playheadPercent)));
        
        // Update rendered notes map for future reference
        renderedNotesRef.current.set(renderedNote.noteId, renderedNote);
      } else if (notes[noteIndex]) {
        // Fallback to calculated position if bounding box not available
        const note = notes[noteIndex];
        const totalDuration = notes.length > 0 
          ? notes[notes.length - 1].time + secondsPerBeat * beatsPerMeasure
          : secondsPerBeat * beatsPerMeasure * 4;
        
        const noteX = calculateNotePosition(note.time, musicFrame, totalDuration);
        lastTickerXRef.current = noteX;
        
        const playheadPercent = ((noteX - musicFrame.left) / musicFrameWidth) * 100;
        setPlayheadPosition(Math.max(0, Math.min(100, playheadPercent)));
      } else {
        // If no notes available, move ticker based on beat progress
        const beatProgress = currentBeat / (beatsPerMeasure * 4); // Assume 4 measures max
        const tickerX = musicFrame.left + (beatProgress * musicFrameWidth);
        lastTickerXRef.current = tickerX;
        const playheadPercent = ((tickerX - musicFrame.left) / musicFrameWidth) * 100;
        setPlayheadPosition(Math.max(0, Math.min(100, playheadPercent)));
      }
      
      // Check if we've moved to a new system
      const newSystem = getCurrentSystem(noteIndex);
      if (newSystem !== currentSystemRef.current) {
        currentSystemRef.current = newSystem;
      }
    } else {
      // No notes available - move ticker based on beat progress alone
      const beatProgress = Math.min(1, currentBeat / (beatsPerMeasure * 4));
      const tickerX = musicFrame.left + (beatProgress * musicFrameWidth);
      lastTickerXRef.current = tickerX;
      const playheadPercent = ((tickerX - musicFrame.left) / musicFrameWidth) * 100;
      setPlayheadPosition(Math.max(0, Math.min(100, playheadPercent)));
    }
    
    // AUTO-SCROLL: Only when final note of current system completes (MusicXML-driven)
    const systemComplete = isSystemComplete(noteIndex);
    const canvasHeight = canvasHeightRef.current;
    const systemHeight = systemHeightRef.current;
    
    if (systemComplete && !scrollPendingRef.current && musicXML) {
      scrollPendingRef.current = true;
      
      // Scroll to next system using MusicXML system data
      const nextSystem = currentSystemRef.current + 1;
      const targetScrollTop = nextSystem * systemHeight;
      const maxScroll = Math.max(0, canvasHeight - container.clientHeight);
      const smoothScroll = Math.min(targetScrollTop, maxScroll);
      
      const currentScroll = container.scrollTop;
      const scrollDiff = smoothScroll - currentScroll;
      
      if (Math.abs(scrollDiff) > 10) {
        // Smooth scroll animation
        const scrollStep = scrollDiff * 0.2;
        container.scrollTop = currentScroll + scrollStep;
        scrollPositionRef.current = container.scrollTop;
      }
    } else if (!systemComplete) {
      scrollPendingRef.current = false;
      
      // Keep current system in view
      const targetScrollTop = currentSystemRef.current * systemHeight;
      const maxScroll = Math.max(0, canvasHeight - container.clientHeight);
      const currentScroll = container.scrollTop;
      const scrollDiff = targetScrollTop - currentScroll;
      
      if (Math.abs(scrollDiff) > 10) {
        const scrollStep = scrollDiff * 0.1;
        const newScrollTop = Math.min(maxScroll, currentScroll + scrollStep);
        container.scrollTop = newScrollTop;
        scrollPositionRef.current = newScrollTop;
      }
    }
  }, [isRecording, currentBeat, tempo, beatsPerMeasure, recordingStartTime, loading, detectMusicFrame, calculateNotePosition]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2, prev + 0.25));
    setFitToWidth(false);
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.25));
    setFitToWidth(false);
  };

  const handleFitToWidth = () => {
    setFitToWidth(true);
  };

  const handleResetZoom = () => {
    setZoom(1);
    setFitToWidth(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Starter songs are hard-bound to their PDFs - never show upload screen for them
  const isStarter = selectedPiece ? isStarterSong(selectedPiece) : false;
  const hasMusicXML = selectedPiece ? hasMusicXMLSupport(selectedPiece) : false;
  
  // Show upload UI when no file exists - but NEVER for starter songs
  if ((error === "NO_FILE" || error === "FILE_NOT_FOUND" || !fileUrl) && !isStarter && onFileUpload) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <svg
                className="h-8 w-8 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {fileUrl === null || error === "NO_FILE"
                ? "No sheet music available"
                : "Sheet music not found"}
            </h3>
            <p className="mb-6 text-sm text-muted">
              This piece doesn&apos;t have sheet music yet. Upload your own to continue.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-background px-6 py-4 transition-colors hover:bg-accent">
              <svg
                className="h-6 w-6 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="font-medium">Upload Sheet Music (PDF or Image)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border border-border bg-background px-6 py-3 font-medium transition-colors hover:bg-accent"
            >
              Browse Files
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative h-full w-full overflow-auto bg-white ${autoScrollEnabled ? 'scroll-smooth' : ''}`}
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        ...(autoScrollEnabled ? { scrollBehavior: 'auto' } : {}),
        minHeight: '400px', // Ensure minimum height
        height: '100%', // Explicit height
      }}
    >
      {/* MusicXML Support Banner */}
      {selectedPiece && !hasMusicXML && !loading && !error && (
        <div className="sticky top-4 left-4 right-4 z-10 mx-auto mb-4 max-w-4xl rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>View-only mode:</strong> This piece doesn&apos;t have detailed analysis support. 
              You can view the sheet music, but detailed feedback requires supported sheet music format.
            </span>
          </div>
        </div>
      )}
      
      {selectedPiece && hasMusicXML && !loading && !error && (
        <div className="sticky top-4 left-4 right-4 z-10 mx-auto mb-4 max-w-4xl rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Playable & analyzable:</strong> This piece supports detailed feedback, ticker guidance, and note-by-note analysis.
            </span>
          </div>
        </div>
      )}

      {/* Zoom Controls - Sticky so they stay visible during scroll */}
      <div className="sticky top-4 right-4 z-10 float-right flex gap-2 rounded-lg border border-border bg-background p-2 shadow-sm">
        <button
          onClick={handleZoomOut}
          className="rounded px-2 py-1 text-sm hover:bg-accent"
          disabled={zoom <= 0.5}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-2 py-1 text-sm">{fitToWidth ? "Fit" : `${Math.round(zoom * 100)}%`}</span>
        <button
          onClick={handleZoomIn}
          className="rounded px-2 py-1 text-sm hover:bg-accent"
          disabled={zoom >= 2}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitToWidth}
          className={`rounded px-2 py-1 text-sm hover:bg-accent ${fitToWidth ? "bg-accent" : ""}`}
          title="Fit to Width"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="rounded px-2 py-1 text-sm hover:bg-accent"
          title="Reset Zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/50">
          <div className="text-center">
            <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-foreground border-r-transparent"></div>
            <p className="text-sm text-muted">กำลังโหลด...</p>
          </div>
        </div>
      )}
      
      
      <canvas
        ref={canvasRef}
        className="mx-auto block"
        style={{ 
          display: loading || error ? "none" : "block", 
          minHeight: "400px",
          visibility: loading || error ? "hidden" : "visible",
          width: fitToWidth ? "100%" : "auto",
          maxWidth: "100%",
          height: "auto"
        }}
      />
      
      {/* Error state - show clear error instead of blank screen */}
      {(error === "RENDER_ERROR" || error === "FILE_NOT_FOUND" || error === "NO_FILE") && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white p-8 z-30">
          <div className="text-center">
            <div className="mb-4 text-lg font-semibold text-error">
              {error === "FILE_NOT_FOUND" || error === "NO_FILE" ? "Sheet music file not found" : "Failed to render sheet music"}
            </div>
            <p className="mb-4 text-sm text-muted">
              {error === "FILE_NOT_FOUND" || error === "NO_FILE"
                ? `The PDF file "${fileUrl}" could not be found. ${isStarter ? "Please ensure the file exists in /public/sheet-music/ directory." : "Please upload a file or check the file path."}`
                : "The PDF file could not be displayed. Please try again or upload a different file."}
            </p>
            {onFileUpload && !isStarter && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
              >
                Upload Different File
              </button>
            )}
            {isStarter && fileUrl && (
              <p className="text-xs text-muted mt-4">
                Expected file location: <code className="bg-accent px-2 py-1 rounded">{fileUrl}</code>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
