"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { NoteFeedback, MusicPiece } from "@/types";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";

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
}: SheetMusicViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
        // For regular URLs, check if file exists first
        try {
          const headResponse = await fetch(fileUrl, { method: "HEAD" });
          if (!headResponse.ok && headResponse.status === 404) {
            setError("NO_FILE");
            setLoading(false);
            return;
          }
        } catch (checkError) {
          // If HEAD fails, try to load anyway (might be CORS issue)
        }
      }

      const loadingTask = pdfjsLib.getDocument({
        data: pdfData instanceof ArrayBuffer ? pdfData : undefined,
        url: typeof pdfData === "string" ? pdfData : undefined,
        withCredentials: false,
        httpHeaders: {},
      });
      
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

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
      if (!canvas) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const context = canvas.getContext("2d");
      if (!context) return;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      drawFeedback(context, canvas.width, canvas.height);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setError("NO_FILE");
      setLoading(false);
    }
  }, [fileUrl, zoom, fitToWidth]);

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

        const context = canvas.getContext("2d");
        if (!context) return;

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawFeedback(context, canvas.width, canvas.height);
        setLoading(false);
      };

      img.onerror = () => {
        setError("NO_FILE");
        setLoading(false);
      };

      img.src = fileUrl;
    } catch (err) {
      console.error("Error loading image:", err);
      setError("NO_FILE");
      setLoading(false);
    }
  }, [fileUrl, zoom, fitToWidth]);

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
  }, [zoom, fitToWidth]);

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
    }
  }, [autoScrollEnabled]);
  
  // Auto-scroll based on tempo and elapsed time - Rhythm-aware
  useEffect(() => {
    if (!autoScrollEnabled || !containerRef.current || loading || !recordingStartTime) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      setPlayheadPosition(0);
      return;
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
  }, [autoScrollEnabled, tempo, timeSignature, recordingStartTime, loading, hasStructuredNotation, notationData]);

  const drawFeedback = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    if (feedback.length === 0) return;

    // Group feedback by bar
    const feedbackByBar = feedback.reduce((acc, f) => {
      if (!acc[f.bar]) acc[f.bar] = [];
      acc[f.bar].push(f);
      return acc;
    }, {} as Record<number, NoteFeedback[]>);

    // Draw colored overlays for each bar
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

      const colors = {
        correct: "rgba(15, 123, 15, 0.2)",
        slightly_off: "rgba(217, 119, 6, 0.2)",
        wrong: "rgba(220, 38, 38, 0.2)",
      };

      context.fillStyle = colors[worstAccuracy];
      context.fillRect(x, 0, barWidth, height);

      // Draw bar number
      context.fillStyle = "#37352f";
      context.font = "16px sans-serif";
      context.fillText(`Bar ${bar}`, x + 10, 30);
    });
  };

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

  // Show upload UI when no file exists - NO placeholder notation
  if (error === "NO_FILE" || error === "FILE_NOT_FOUND" || !fileUrl) {
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
              This piece doesn't have sheet music yet. Upload your own to continue.
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
      style={autoScrollEnabled ? { scrollBehavior: 'auto' } : {}}
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
      
      {/* Playhead indicator - moves left-to-right during recording */}
      {autoScrollEnabled && canvasRef.current && !loading && (
        <div
          className="absolute top-0 z-20 h-full w-0.5 bg-blue-500 transition-all duration-100"
          style={{
            left: `${playheadPosition}%`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            boxShadow: '0 0 4px rgba(59, 130, 246, 0.8)',
          }}
        />
      )}
      
      <canvas
        ref={canvasRef}
        className="mx-auto block max-w-full"
        style={{ display: loading ? "none" : "block", minHeight: "400px" }}
      />
    </div>
  );
}
