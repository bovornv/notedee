"use client";

import { Mic } from "lucide-react";

interface RecordingIndicatorProps {
  isRecording: boolean;
}

export default function RecordingIndicator({ isRecording }: RecordingIndicatorProps) {
  if (!isRecording) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-slate-600/80 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
      <div className="relative">
        <Mic className="h-4 w-4" />
        <div className="absolute inset-0 h-4 w-4 animate-pulse rounded-full bg-slate-400 opacity-50"></div>
      </div>
      <span className="text-sm font-medium">Listening...</span>
    </div>
  );
}

