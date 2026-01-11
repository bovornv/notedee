"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { NoteFeedback, MusicPiece } from "@/types";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { isStarterSong } from "@/lib/starterLibrary";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(false);
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
  const currentSystemRef = useRef<number>(0); // Track current system (staff) being played
  const measureTimestampsRef = useRef<Map<number, number>>(new Map()); // Track when measures were added for fade-in
  
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
    }
  }, [loading, canvasRef.current?.height]);

  // Draw PURELY POSITIONAL guidance during recording
  // NO correctness evaluation, NO pitch reactions, NO color changes
  // ONLY purpose: Show "This is where you are in the score"
  // Draws a note-sized indicator that matches the visual scale of sheet music notes
  const drawLiveGuidance = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentPosition: number,
    scale: number
  ) => {
    // CRITICAL: Only show during live recording, NEVER during analysis
    // If feedback exists, we're in post-analysis mode - don't show live guidance
    if (!isRecording || feedback.length > 0) return;

    // PURELY POSITIONAL: No correctness logic, no pitch detection, no judgment
    // Indicator advances based ONLY on tempo and beat timing
    // Single neutral color, low opacity, no animations
    
    // Calculate note head size based on sheet music scale
    // Typical note head in printed music: ~3-4mm at 100% zoom
    // Scale with zoom: base size * scale factor
    const baseNoteSize = 3.5; // Base size in pixels at 1x zoom (matches typical note head)
    const noteHeadRadius = Math.max(1.5, (baseNoteSize * scale) / 2); // Radius scales with zoom, min 1.5px
    
    // Calculate horizontal position (0-100% across canvas width)
    // Ensure minimum position so indicator is always visible when recording starts
    const minPosition = currentPosition === 0 && isRecording ? 2 : currentPosition; // Show at 2% if at start
    const playheadX = Math.max(10, (minPosition / 100) * width); // Minimum 10px from left edge
    
    // Calculate vertical position: approximate staff line positions
    const systemsPerPage = Math.ceil(height / systemHeightRef.current) || 4;
    const systemHeight = height / systemsPerPage;
    
    // Draw indicator on the current active system (where music is being played)
    // Default to first system if not set yet
    const activeSystem = Math.max(0, Math.min(currentSystemRef.current || 0, systemsPerPage - 1));
    const systemTop = activeSystem * systemHeight;
    const systemBottom = (activeSystem + 1) * systemHeight;
    const staffCenterY = systemTop + (systemBottom - systemTop) * 0.5; // Middle of system
    
    // Always draw if recording (even if position is 0) - make it visible
    if (isRecording && playheadX >= 0 && playheadX <= width && staffCenterY >= 0 && staffCenterY <= height) {
      // SINGLE NEUTRAL COLOR - Never changes based on correctness
      // Soft blue-gray, low opacity, no flashing, no pulsing
      // Make it slightly more visible in Calm Mode so users can see it
      const baseColor = feedbackMode === "calm" 
        ? "rgba(120, 130, 145, 0.5)"  // Calm: 50% opacity (more visible)
        : "rgba(100, 116, 139, 0.4)"; // Practice: 40% opacity
      
      const indicatorRadius = feedbackMode === "calm" 
        ? Math.max(noteHeadRadius, 2.5) // Ensure minimum size for visibility
        : noteHeadRadius * 1.2; // Practice mode slightly larger
      
      const guideLineHeight = feedbackMode === "calm"
        ? systemHeight * 0.3 // Slightly taller guide line for visibility
        : systemHeight * 0.3;
      
      context.save();
      context.globalAlpha = feedbackMode === "calm" ? 0.5 : 0.4; // More visible in calm mode
      context.fillStyle = baseColor;
      context.strokeStyle = baseColor;
      
      // Draw note-sized circle indicator - PURELY POSITIONAL
      // This shows "you are here" - nothing more, nothing less
      context.beginPath();
      context.arc(playheadX, staffCenterY, indicatorRadius, 0, Math.PI * 2);
      context.fill();
      
      // Draw subtle vertical guide line - PURELY POSITIONAL
      // Like an editor cursor, not a game marker
      context.lineWidth = Math.max(0.5, scale * (feedbackMode === "calm" ? 0.2 : 0.25));
      context.beginPath();
      context.moveTo(playheadX, staffCenterY - guideLineHeight / 2);
      context.lineTo(playheadX, staffCenterY + guideLineHeight / 2);
      context.stroke();
      
      context.restore();
    }
  }, [isRecording, feedback.length, feedbackMode]);

  // Draw measure boundary lines when notationData is available
  // Subtle vertical lines showing where measures begin/end
  const drawMeasureBoundaries = useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number
  ) => {
    // Only show boundaries when we have structured notation data
    if (!notationData || !notationData.measures.length) return;
    
    // Calculate measure boundaries based on tempo
    const secondsPerBeat = 60 / tempo;
    const totalBeats = notationData.totalBeats || notationData.measures.reduce((sum, m) => sum + m.duration, 0);
    const totalDuration = totalBeats * secondsPerBeat;
    
    // Draw subtle vertical lines for each measure boundary
    notationData.measures.forEach((measure, index) => {
      // Calculate horizontal position based on beat position
      const measureStartBeat = measure.startBeat;
      const measureEndBeat = measure.startBeat + measure.duration;
      
      // Convert beat positions to canvas X positions (0-100% of width)
      const startXPercent = (measureStartBeat / totalBeats) * 100;
      const endXPercent = (measureEndBeat / totalBeats) * 100;
      
      const startX = (startXPercent / 100) * width;
      const endX = (endXPercent / 100) * width;
      
      // Draw measure start line (subtle, like a staff line)
      if (index > 0) { // Don't draw line at the very start
        context.save();
        context.strokeStyle = "rgba(200, 200, 200, 0.3)"; // Very subtle gray
        context.lineWidth = Math.max(0.5, scale * 0.3); // Thin line, scales with zoom
        context.setLineDash([2, 2]); // Dashed line for subtlety
        context.beginPath();
        context.moveTo(startX, 0);
        context.lineTo(startX, height);
        context.stroke();
        context.restore();
      }
      
      // Optionally draw measure number above the line (very subtle)
      if (index < 8) { // Only show first 8 measures to avoid clutter
        context.save();
        context.fillStyle = "rgba(150, 150, 150, 0.4)";
        context.font = `${Math.max(8, 10 * scale)}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(`${measure.measureNumber}`, startX + 2, 5);
        context.restore();
      }
    });
  }, [notationData, tempo]);

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

    try {
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
      });
      
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      pdfPageRef.current = page; // Store for redrawing

      // Calculate scale based on fit-to-width or zoom
      let scale = 2.0;
      if (fitToWidth && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40;
        const viewport = page.getViewport({ scale: 1.0 });
        scale = Math.min(containerWidth / viewport.width, 3.0);
      } else {
        scale = 2.0 * zoom;
      }

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) {
        setError("RENDER_ERROR");
        setLoading(false);
        return;
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      currentScaleRef.current = scale; // Store scale for note sizing

      const context = canvas.getContext("2d");
      if (!context) {
        setError("RENDER_ERROR");
        setLoading(false);
        return;
      }

      // Clear canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

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
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      // Check if it's a file not found error
      if (err.name === "MissingPDFException" || 
          err.message?.includes("404") || 
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("NetworkError") ||
          err.message?.includes("file not found")) {
        setError("FILE_NOT_FOUND");
      } else {
        setError("RENDER_ERROR");
      }
      setLoading(false);
    }
  }, [fileUrl, zoom, fitToWidth, drawFeedback, drawDelayedMeasureFeedback, drawLiveGuidance, drawMeasureBoundaries, feedbackMode, isRecording, playheadPosition, feedback.length, notationData, tempo]);

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
    if (!fileUrl) {
      setError("NO_FILE");
      setLoading(false);
      return;
    }

    if (fileType === "pdf") {
      loadPDF();
    } else {
      loadImage();
    }
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

  // Continuous animation loop for fade-in effects during Practice Mode
  useEffect(() => {
    if (!isRecording || feedbackMode !== "practice" || feedback.length > 0 || loading || !canvasRef.current) return;
    
    let animationFrameId: number;
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      
      // Redraw base content and overlays
      const redraw = async () => {
        if (fileType === "pdf" && pdfPageRef.current) {
          const currentScale = canvas.width / pdfPageRef.current.view[2];
          const viewport = pdfPageRef.current.getViewport({ scale: currentScale });
          context.clearRect(0, 0, canvas.width, canvas.height);
          await pdfPageRef.current.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
          
          if (notationData) {
            drawMeasureBoundaries(context, canvas.width, canvas.height, currentScale);
          }
          if (isRecording && feedback.length === 0) {
            drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, currentScale);
            drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
          }
        } else if (fileType === "image" && imageRef.current) {
          const imageScale = canvas.width / imageRef.current.width;
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
          
          if (notationData) {
            drawMeasureBoundaries(context, canvas.width, canvas.height, imageScale);
          }
          if (isRecording && feedback.length === 0) {
            drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition || 1, imageScale);
            drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
          }
        }
      };
      
      redraw();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isRecording, feedbackMode, feedback.length, loading, fileType, playheadPosition, delayedMeasureFeedback, analyzingMeasures, measureAnalysisErrors, drawLiveGuidance, drawDelayedMeasureFeedback]);

  // Redraw canvas when playhead position changes during recording (for live guidance)
  useEffect(() => {
    if (!isRecording || feedback.length > 0 || loading || !canvasRef.current) return;
    if (feedbackMode === "practice") return; // Handled by animation loop above
    
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = currentScaleRef.current;

    // Redraw the base content (PDF or image) and then overlay live guidance
    const redraw = async () => {
      if (fileType === "pdf" && pdfPageRef.current) {
        // Get current viewport scale
        const currentScale = canvas.width / pdfPageRef.current.view[2];
        const viewport = pdfPageRef.current.getViewport({ scale: currentScale });
        currentScaleRef.current = currentScale;
        
        // Clear and redraw PDF
        context.clearRect(0, 0, canvas.width, canvas.height);
        await pdfPageRef.current.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        // Draw measure boundaries first (if available)
        if (notationData) {
          drawMeasureBoundaries(context, canvas.width, canvas.height, currentScale);
        }
        
        // Overlay live guidance with proper scale (only during recording)
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition, currentScale);
          // In Practice Mode, also draw delayed measure feedback
          if (feedbackMode === "practice") {
            drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
          }
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
        
        // Overlay live guidance with proper scale (only during recording)
        if (isRecording && feedback.length === 0) {
          drawLiveGuidance(context, canvas.width, canvas.height, playheadPosition, imageScale);
          // In Practice Mode, also draw delayed measure feedback
          if (feedbackMode === "practice") {
            drawDelayedMeasureFeedback(context, canvas.width, canvas.height);
          }
        } else if (feedback.length > 0 && !isRecording) {
          drawFeedback(context, canvas.width, canvas.height);
        }
      }
    };

    redraw();
  }, [playheadPosition, isRecording, feedback.length, loading, fileType, drawLiveGuidance, drawFeedback, drawDelayedMeasureFeedback, drawMeasureBoundaries, feedbackMode, delayedMeasureFeedback, analyzingMeasures, notationData, tempo]);
  
  // Auto-scroll based on tempo and elapsed time - Rhythm-aware
  useEffect(() => {
    if (!autoScrollEnabled || !containerRef.current || loading || !recordingStartTime) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      // Only reset to 0 when not recording, keep position during recording
      if (!isRecording) {
        setPlayheadPosition(0);
      }
      return;
    }
    
    // Initialize playhead position to a small value so indicator is visible immediately
    if (playheadPosition === 0) {
      setPlayheadPosition(1); // Start at 1% so indicator is visible
    }

    const container = containerRef.current;
    const systemHeight = systemHeightRef.current;
    const canvasHeight = canvasHeightRef.current;
    const startTime = recordingStartTime;
    const secondsPerBeat = 60 / tempo;
    
    // MODE A: Structured Notation (Precise)
    if (hasStructuredNotation && notationData) {
      const { measures, totalBeats } = notationData;
      
      const animateScroll = () => {
        if (!autoScrollEnabled || !container || !recordingStartTime) {
          return;
        }
        
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        const currentBeat = (elapsedSeconds / secondsPerBeat);
        
        // Find current measure based on beat position
        let currentMeasure = measures[0];
        for (const measure of measures) {
          if (currentBeat >= measure.startBeat && currentBeat < measure.startBeat + measure.duration) {
            currentMeasure = measure;
            break;
          }
        }
        
        // Find target system (line) for current measure
        const targetSystem = currentMeasure.systemIndex;
        const targetScrollTop = targetSystem * systemHeight;
        const maxScroll = Math.max(0, canvasHeight - container.clientHeight);
        
        // Calculate playhead position based on beat progress
        const progressInMeasure = (currentBeat - currentMeasure.startBeat) / currentMeasure.duration;
        const overallProgress = currentBeat / totalBeats;
        const playheadPercent = Math.min(100, Math.max(0, overallProgress * 100));
        setPlayheadPosition(playheadPercent);
        
        // Scroll to target system (with slight lead - scroll early)
        const leadTime = 0.5; // Scroll 0.5 seconds before measure ends
        const beatsUntilNextSystem = currentMeasure.duration - progressInMeasure * currentMeasure.duration;
        if (beatsUntilNextSystem * secondsPerBeat <= leadTime) {
          // Scroll to next system early
          const nextSystemIndex = Math.min(targetSystem + 1, Math.ceil(canvasHeight / systemHeight) - 1);
          const nextSystemScroll = nextSystemIndex * systemHeight;
          const smoothScroll = Math.min(nextSystemScroll, maxScroll);
          
          const currentScroll = container.scrollTop;
          const scrollDiff = smoothScroll - currentScroll;
          const scrollStep = scrollDiff * 0.15; // Smooth interpolation
          container.scrollTop = currentScroll + scrollStep;
          scrollPositionRef.current = container.scrollTop;
        } else {
          // Smooth scroll to current system
          const currentScroll = container.scrollTop;
          const scrollDiff = targetScrollTop - currentScroll;
          const scrollStep = scrollDiff * 0.1;
          const newScrollTop = Math.min(maxScroll, currentScroll + scrollStep);
          container.scrollTop = newScrollTop;
          scrollPositionRef.current = newScrollTop;
        }
        
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      };
      
      scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      
      return () => {
        if (scrollAnimationRef.current) {
          cancelAnimationFrame(scrollAnimationRef.current);
          scrollAnimationRef.current = null;
        }
      };
    }
    
    // MODE B: PDF/Image Upload (Measure-based, Metronome-aligned)
    // Scroll measure-by-measure, aligned to metronome beats
    const measuresPerSystem = 4; // Typical: 4 measures per system
    const beatsPerSystem = measuresPerSystem * beatsPerMeasure;
    const secondsPerMeasure = beatsPerMeasure * secondsPerBeat;
    const secondsPerSystem = beatsPerSystem * secondsPerBeat;
    
    const animateScroll = () => {
      if (!autoScrollEnabled || !container || !recordingStartTime) {
        return;
      }
      
      const now = Date.now();
      const elapsedSeconds = (now - startTime) / 1000;
      
      // Calculate current measure and beat within measure
      const totalBeatsElapsed = elapsedSeconds / secondsPerBeat;
      const currentMeasure = Math.floor(totalBeatsElapsed / beatsPerMeasure);
      const beatInMeasure = totalBeatsElapsed % beatsPerMeasure;
      
      // Calculate which system we should be viewing
      // Scroll to next system slightly early (0.5 seconds before measure ends)
      const measuresElapsed = totalBeatsElapsed / beatsPerMeasure;
      const systemsElapsed = measuresElapsed / measuresPerSystem;
      
      // Lead time: scroll to next system 0.5 seconds early
      const leadBeats = 0.5 / secondsPerBeat;
      const adjustedSystemsElapsed = (totalBeatsElapsed + leadBeats) / beatsPerSystem;
      
      const targetSystem = Math.floor(adjustedSystemsElapsed);
      const targetScrollTop = targetSystem * systemHeight;
      const maxScroll = Math.max(0, canvasHeight - container.clientHeight);
      
      // Calculate playhead position (left-to-right)
      const totalSystems = Math.ceil(canvasHeight / systemHeight);
      const progressInSystem = (adjustedSystemsElapsed % 1);
      const overallProgress = totalSystems > 0 ? (targetSystem + progressInSystem) / totalSystems : 0;
      const playheadPercent = Math.min(100, Math.max(0, overallProgress * 100));
      setPlayheadPosition(playheadPercent);
      
      // Track current system for indicator positioning
      currentSystemRef.current = targetSystem;
      
      // Smooth scroll to target position
      if (targetScrollTop <= maxScroll) {
        const currentScroll = container.scrollTop;
        const scrollDiff = targetScrollTop - currentScroll;
        
        // Smooth interpolation (easing)
        const scrollStep = scrollDiff * 0.1; // 10% of difference per frame
        const newScrollTop = currentScroll + scrollStep;
        
        container.scrollTop = newScrollTop;
        scrollPositionRef.current = newScrollTop;
      } else {
        // Reached end of music
        container.scrollTop = maxScroll;
        scrollPositionRef.current = maxScroll;
        setPlayheadPosition(100);
      }
      
      scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    };
    
    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
    
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
    };
  }, [autoScrollEnabled, tempo, timeSignature, recordingStartTime, loading, hasStructuredNotation, notationData, beatsPerMeasure, isRecording, playheadPosition]);

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
        className="mx-auto block max-w-full"
        style={{ 
          display: loading || error ? "none" : "block", 
          minHeight: "400px",
          visibility: loading || error ? "hidden" : "visible"
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
