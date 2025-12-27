"use client";

import { useAuthStore } from "@/store/authStore";
import { getTodaySessions } from "@/lib/sessionLimits";
import { FREE_TIER_DAILY_LIMIT } from "@/lib/constants";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SessionLimitBanner() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [todaySessions, setTodaySessions] = useState(0);

  useEffect(() => {
    if (user?.subscriptionTier === "free") {
      setTodaySessions(getTodaySessions());
    }
  }, [user]);

  const handleUpgrade = () => {
    if (!user) return;
    
    // Update user subscription tier to paid
    const updatedUser = {
      ...user,
      subscriptionTier: "paid" as const,
    };
    
    setUser(updatedUser);
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("notedee_user", JSON.stringify(updatedUser));
    }
    
    // Optionally navigate to profile page to show updated status
    router.push("/profile");
  };

  if (!user || user.subscriptionTier !== "free") {
    return null;
  }

  const remaining = FREE_TIER_DAILY_LIMIT - todaySessions;

  if (remaining <= 0) {
    return (
      <div className="border-b border-border bg-warning/10 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-sm text-foreground">
            คุณใช้สิทธิ์ฟรีครบแล้ววันนี้
          </p>
          <button 
            onClick={handleUpgrade}
            className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-background hover:bg-warning/90 transition-colors"
          >
            <Crown className="h-4 w-4" />
            อัปเกรดเป็นสมาชิก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-accent px-6 py-2">
      <div className="mx-auto max-w-7xl text-center">
        <p className="text-sm text-muted">
          เหลือ {remaining} ครั้งสำหรับวันนี้
        </p>
      </div>
    </div>
  );
}

