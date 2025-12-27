"use client";

import { create } from "zustand";
import { Language } from "@/lib/constants";
import { setGlobalLanguage } from "@/lib/translations";

interface LanguageState {
  language: Language;
  initialized: boolean;
  setLanguage: (lang: Language) => void;
  initialize: () => void;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: "th",
  initialized: false,
  setLanguage: (lang: Language) => {
    set({ language: lang });
    setGlobalLanguage(lang);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("notedee-language", JSON.stringify({ language: lang }));
      // Force re-render by dispatching storage event
      window.dispatchEvent(new Event("languagechange"));
    }
  },
  initialize: () => {
    if (get().initialized || typeof window === "undefined") return;
    
    const stored = localStorage.getItem("notedee-language");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.language) {
          const lang = data.language as Language;
          set({ language: lang, initialized: true });
          setGlobalLanguage(lang);
        } else {
          set({ initialized: true });
        }
      } catch (e) {
        set({ initialized: true });
      }
    } else {
      set({ initialized: true });
    }
  },
}));
