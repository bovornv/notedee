"use client";

import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import SessionLimitBanner from "./SessionLimitBanner";
import LoadingScreen from "./LoadingScreen";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/types";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notedee_user");
      if (stored && !user) {
        try {
          const userData = JSON.parse(stored);
          userData.createdAt = new Date(userData.createdAt);
          setUser(userData as User);
        } catch (e) {
          // Ignore parse errors
        }
      }
      // Always set loading to false after checking localStorage
      setIsInitializing(false);
    } else {
      setIsInitializing(false);
    }
  }, [setUser, user]);

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

