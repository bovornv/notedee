"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { LogOut, User, Crown, Upload, X } from "lucide-react";
import { t } from "@/lib/translations";
import { LANGUAGES, Language } from "@/lib/constants";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { language, setLanguage, initialize } = useLanguageStore();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Load profile image from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`notedee_profile_${user.id}`);
      if (stored) {
        setProfileImage(stored);
      }
    }
  }, [user, router]);

  const handleLogout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("notedee_user");
      localStorage.removeItem("notedee_daily_sessions");
    }
    router.push("/login");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = reader.result as string;
        setProfileImage(imageDataUrl);
        if (user && typeof window !== "undefined") {
          localStorage.setItem(`notedee_profile_${user.id}`, imageDataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    if (user && typeof window !== "undefined") {
      localStorage.removeItem(`notedee_profile_${user.id}`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-semibold">{t("nav.profile")}</h1>

      {/* Profile Info */}
      <div className="mb-6 rounded-lg border border-border bg-background p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative">
            {profileImage ? (
              <Image
                src={profileImage}
                alt="Profile"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                <User className="h-8 w-8 text-muted" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              <Upload className="h-3 w-3" />
            </button>
            {profileImage && (
              <button
                onClick={handleRemoveImage}
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-white hover:bg-error/90"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {user.nickname && (
          <div className="mb-2 text-sm">
            <span className="text-muted">ชื่อเล่น: </span>
            <span>{user.nickname}</span>
          </div>
        )}

        <div className="text-sm">
          <span className="text-muted">เครื่องดนตรี: </span>
          <span>ไวโอลิน</span>
        </div>
      </div>

      {/* Subscription */}
      <div className="mb-6 rounded-lg border border-border bg-background p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {t("profile.subscription")}
          </h3>
          {user.subscriptionTier === "paid" && (
            <Crown className="h-5 w-5 text-warning" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${
              user.subscriptionTier === "paid"
                ? "bg-warning/20 text-warning"
                : "bg-muted/20 text-muted"
            }`}
          >
            {user.subscriptionTier === "paid"
              ? t("profile.paid_tier")
              : t("profile.free_tier")}
          </span>
        </div>
        {user.subscriptionTier === "free" && (
          <div className="mt-4">
            <p className="mb-3 text-sm text-muted">
              อัปเกรดเป็นสมาชิกเพื่อฝึกซ้อมได้ไม่จำกัดและรับข้อเสนอแนะแบบละเอียด
            </p>
            <button
              onClick={() => {
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
              }}
              className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-background hover:bg-warning/90 transition-colors"
            >
              <Crown className="h-4 w-4" />
              อัปเกรดเป็นสมาชิก
            </button>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="mb-6 rounded-lg border border-border bg-background p-6">
        <h3 className="mb-4 text-lg font-semibold">ภาษา</h3>
        <div className="flex gap-2">
          {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                language === lang
                  ? "bg-foreground text-background"
                  : "bg-accent text-foreground hover:bg-accent/80"
              }`}
            >
              {LANGUAGES[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-lg border border-border bg-background p-6">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}
