export const FREE_TIER_DAILY_LIMIT = 3; // sessions per day
export const MIN_TEMPO = 60;
export const MAX_TEMPO = 180;
export const DEFAULT_TEMPO = 120;

export const ACCURACY_THRESHOLDS = {
  correct: 0.95, // 95%+ accuracy
  slightly_off: 0.8, // 80-95% accuracy
  wrong: 0.0, // <80% accuracy
};

export const LANGUAGES = {
  th: "ไทย",
  en: "English",
} as const;

export type Language = keyof typeof LANGUAGES;

