"use client";

import { useEffect, useRef } from "react";
import { usePracticeStore } from "@/store/practiceStore";

export default function Metronome() {
  const { metronomeEnabled, tempo, isRecording, countdown, setCurrentBeat, currentBeat } = usePracticeStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextTickTimeRef = useRef<number>(0);

  // Metronome should play during countdown or recording
  const shouldPlay = metronomeEnabled && (isRecording || (countdown !== null && countdown > 0));

  useEffect(() => {
    if (!shouldPlay) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      // Reset beat counter when metronome stops (only reset, don't check currentBeat to avoid dependency)
      if (!isRecording) {
        setCurrentBeat(0);
      }
      return;
    }

    // Initialize AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }

    const playTick = () => {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") return;

      // Resume context if suspended (required for user interaction)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);

      // CRITICAL: Emit beat event - this is the single source of truth for ticker movement
      // Only increment beat counter during recording (not countdown)
      // Use functional update to avoid dependency on currentBeat value
      if (isRecording) {
        setCurrentBeat((prev) => prev + 1);
      }
    };

    // Use Web Audio API scheduling for precise timing
    const scheduleTicks = () => {
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === "closed") return;

      const interval = 60 / tempo; // Convert BPM to seconds per beat
      const now = ctx.currentTime;
      
      // Schedule next 8 beats ahead
      for (let i = 0; i < 8; i++) {
        const time = now + i * interval;
        setTimeout(() => {
          if (shouldPlay && audioContextRef.current) {
            playTick();
          }
        }, (time - now) * 1000);
      }
    };

    // Initial tick
    playTick();
    scheduleTicks();

    // Use setInterval as fallback for continuous playback
    const interval = 60000 / tempo; // Convert BPM to milliseconds
    intervalRef.current = setInterval(() => {
      if (shouldPlay && audioContextRef.current) {
        playTick();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldPlay, tempo, isRecording, setCurrentBeat]);

  return null;
}
