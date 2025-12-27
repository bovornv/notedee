import { User } from "@/types";
import { FREE_TIER_DAILY_LIMIT } from "./constants";

// In production, this would check against a database
// For MVP, we'll use localStorage to track daily sessions
const STORAGE_KEY = "notedee_daily_sessions";

interface DailySessionCount {
  date: string;
  count: number;
}

export function getTodaySessions(): number {
  if (typeof window === "undefined") return 0;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;

  const data: DailySessionCount = JSON.parse(stored);
  const today = new Date().toISOString().split("T")[0];

  if (data.date === today) {
    return data.count;
  }

  return 0;
}

export function incrementTodaySessions(): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(STORAGE_KEY);
  const today = new Date().toISOString().split("T")[0];

  if (stored) {
    const data: DailySessionCount = JSON.parse(stored);
    if (data.date === today) {
      data.count += 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return;
    }
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: today, count: 1 })
  );
}

export function canStartSession(user: User | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!user) {
    return { allowed: false, reason: "กรุณาเข้าสู่ระบบ" };
  }

  if (user.subscriptionTier === "paid") {
    return { allowed: true };
  }

  const todaySessions = getTodaySessions();
  if (todaySessions >= FREE_TIER_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: `คุณใช้สิทธิ์ฟรีครบ ${FREE_TIER_DAILY_LIMIT} ครั้งแล้ววันนี้ อัปเกรดเป็นสมาชิกเพื่อฝึกซ้อมได้ไม่จำกัด`,
    };
  }

  return { allowed: true };
}

