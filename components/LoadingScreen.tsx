"use client";

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-foreground border-r-transparent"></div>
        <p className="text-muted">กำลังโหลด...</p>
      </div>
    </div>
  );
}

