"use client";

interface CountdownProps {
  count: number | null;
  onComplete: () => void;
}

export default function Countdown({ count, onComplete }: CountdownProps) {
  if (count === null || count <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="text-center">
        <div className="mb-4 text-9xl font-bold text-white transition-all duration-300 animate-pulse">
          {count > 0 ? count : "Go!"}
        </div>
        <p className="text-lg text-white/80">
          {count > 0 ? "Get ready..." : "Start playing"}
        </p>
      </div>
    </div>
  );
}

