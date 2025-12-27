"use client";

import { Mic, MicOff } from "lucide-react";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/lib/translations";

interface MicIndicatorProps {
  isRecording: boolean;
  hasPermission: boolean;
}

export default function MicIndicator({
  isRecording,
  hasPermission,
}: MicIndicatorProps) {
  const { language } = useLanguageStore();
  
  if (!hasPermission) {
    return (
      <div className="flex items-center gap-2 text-error">
        <MicOff className="h-5 w-5" />
        <span className="text-sm">{t("error.mic_denied", language || "th")}</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 text-error">
        <div className="relative">
          <Mic className="h-5 w-5 animate-pulse" />
          <div className="absolute inset-0 h-5 w-5 animate-ping rounded-full bg-error opacity-75"></div>
        </div>
        <span className="text-sm font-medium">{t("mic.recording", language || "th")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted">
      <Mic className="h-5 w-5" />
      <span className="text-sm">{t("mic.ready", language || "th")}</span>
    </div>
  );
}

