"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { t } from "@/lib/translations";
import { LANGUAGES, Language } from "@/lib/constants";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { language, initialize, setLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  const navItems = [
    { href: "/main", label: t("nav.practice", language || "th") },
    { href: "/progress", label: t("nav.progress", language || "th") },
    { href: "/profile", label: t("nav.profile", language || "th") },
  ];

  if (!user) {
    return null;
  }

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/main" className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
              >
                {/* White background */}
                <rect width="32" height="32" fill="white" />
                {/* First eighth note (left) */}
                <g transform="translate(6, 8)">
                  {/* Note head - oval */}
                  <ellipse cx="4" cy="12" rx="3" ry="2.5" fill="black" />
                  {/* Stem - vertical line extending upward from right side */}
                  <rect x="7" y="0" width="1.5" height="12" fill="black" />
                  {/* Flag - curling to the right at top of stem */}
                  <path
                    d="M 8.5 0 Q 10 1, 11 2 Q 12 3, 11.5 4 Q 11 5, 9.5 4.5 Q 8.5 4, 8.5 2.5 L 8.5 0 Z"
                    fill="black"
                  />
                </g>
                {/* Second eighth note (right) */}
                <g transform="translate(18, 8)">
                  {/* Note head - oval */}
                  <ellipse cx="4" cy="12" rx="3" ry="2.5" fill="black" />
                  {/* Stem - vertical line extending upward from right side */}
                  <rect x="7" y="0" width="1.5" height="12" fill="black" />
                  {/* Flag - curling to the right at top of stem */}
                  <path
                    d="M 8.5 0 Q 10 1, 11 2 Q 12 3, 11.5 4 Q 11 5, 9.5 4.5 Q 8.5 4, 8.5 2.5 L 8.5 0 Z"
                    fill="black"
                  />
                </g>
              </svg>
              <span className="text-xl font-semibold">{t("app.name", language || "th")}</span>
            </Link>
            <div className="hidden md:flex md:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Language Toggle - Top Right */}
          <div className="flex items-center gap-2">
            {(Object.keys(LANGUAGES) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
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
      </div>
    </nav>
  );
}
