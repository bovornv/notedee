"use client";

import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import SessionLimitBanner from "./SessionLimitBanner";
import LoadingScreen from "./LoadingScreen";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Client-side only initialization
    if (typeof window === "undefined") {
      setIsInitializing(false);
      return;
    }

    // Initialize immediately - don't wait
    const init = () => {
      try {
        const stored = localStorage.getItem("notedee_user");
        if (stored) {
          try {
            const userData = JSON.parse(stored);
            userData.createdAt = new Date(userData.createdAt);
            setUser(userData as User);
          } catch (e) {
            // Ignore parse errors - continue without user
            console.warn("Failed to parse user data:", e);
          }
        }
      } catch (e) {
        // Ignore localStorage errors - continue without user
        console.warn("Failed to access localStorage:", e);
      } finally {
        // Always hide loading - never block
        setIsInitializing(false);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(init, { timeout: 50 });
    } else {
      setTimeout(init, 0);
    }
  }, [setUser]);

  // Absolute safety: hide loading after 200ms max
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsInitializing(false);
      setHasError(false);
    }, 200);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Show error state if something critical fails
  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg font-semibold text-error">
            เกิดข้อผิดพลาดในการโหลดแอป
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-foreground px-4 py-2 text-background hover:bg-foreground/90"
          >
            โหลดใหม่
          </button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Navbar />
      <SessionLimitBanner />
      {children}
    </>
  );
}
