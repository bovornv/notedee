"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Music } from "lucide-react";
import { t } from "@/lib/translations";
import { User } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/main");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock authentication - in production, this would call an API
    setTimeout(() => {
      const mockUser: User = {
        id: "1",
        email: email,
        name: name || email.split("@")[0],
        instrument: "violin",
        subscriptionTier: "free",
        createdAt: new Date(),
      };

      setUser(mockUser);
      // Store in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("notedee_user", JSON.stringify(mockUser));
      }
      setLoading(false);
      router.push("/main");
    }, 500);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Music className="h-8 w-8 text-foreground" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-semibold">{t("app.name")}</h1>
          <p className="text-muted">
            เครื่องมือฝึกซ้อมไวโอลินสำหรับนักเรียนไทย
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                ชื่อ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-foreground"
                required={isSignup}
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-foreground"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-foreground"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-4 py-2 font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {loading
              ? "กำลังโหลด..."
              : isSignup
              ? t("auth.signup")
              : t("auth.login")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm text-muted hover:text-foreground"
          >
            {isSignup
              ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"
              : "ยังไม่มีบัญชี? สมัครสมาชิก"}
          </button>
        </div>
      </div>
    </div>
  );
}

