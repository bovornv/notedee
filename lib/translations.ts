import { Language } from "./constants";

type Translations = {
  [key: string]: {
    th: string;
    en: string;
  };
};

const translations: Translations = {
  "app.name": {
    th: "Notedee",
    en: "Notedee",
  },
  "nav.practice": {
    th: "ฝึกซ้อม",
    en: "Practice",
  },
  "nav.progress": {
    th: "ความก้าวหน้า",
    en: "Progress",
  },
  "nav.profile": {
    th: "โปรไฟล์",
    en: "Profile",
  },
  "step1.title": {
    th: "ขั้นตอนที่ 1: เลือกเพลง",
    en: "Step 1: Select Music",
  },
  "step1.explore": {
    th: "สำรวจเพลงสาธารณะ",
    en: "Explore Public Music",
  },
  "step1.explore_desc": {
    th: "เลือกจากเพลงสาธารณะ",
    en: "Choose from public-domain pieces",
  },
  "step1.upload": {
    th: "อัปโหลดโน้ตเพลง",
    en: "Upload Sheet Music",
  },
  "step1.upload_desc": {
    th: "ไฟล์ PDF หรือรูปภาพ",
    en: "PDF or image file",
  },
  "step1.change": {
    th: "เปลี่ยน",
    en: "Change",
  },
  "step1.locked": {
    th: "ทำขั้นตอนที่ 1 ให้เสร็จก่อน",
    en: "Complete Step 1 first",
  },
  "step2.title": {
    th: "ขั้นตอนที่ 2: เล่นและบันทึก",
    en: "Step 2: Play & Record",
  },
  "step2.start": {
    th: "เริ่มบันทึก",
    en: "Start Recording",
  },
  "step2.stop": {
    th: "หยุดบันทึก",
    en: "Stop Recording",
  },
  "step2.completed": {
    th: "บันทึกเสร็จแล้ว",
    en: "Recording completed",
  },
  "step2.analyze": {
    th: "วิเคราะห์ผลการเล่น",
    en: "Analyze Performance",
  },
  "step2.analyzing": {
    th: "กำลังวิเคราะห์...",
    en: "Analyzing...",
  },
  "step2.locked": {
    th: "ทำขั้นตอนที่ 1 ให้เสร็จก่อน",
    en: "Complete Step 1 to unlock recording",
  },
  "step3.title": {
    th: "ขั้นตอนที่ 3: วิเคราะห์ผลการเล่น",
    en: "Step 3: Analyze Performance",
  },
  "step3.locked": {
    th: "ทำขั้นตอนที่ 2 ให้เสร็จก่อน",
    en: "Complete Step 2 to unlock analysis",
  },
  "step3.results": {
    th: "ผลการวิเคราะห์",
    en: "Analysis Results",
  },
  "step3.main_issues": {
    th: "ประเด็นหลัก:",
    en: "Main issues:",
  },
  "step3.correct": {
    th: "ถูกต้อง",
    en: "Correct",
  },
  "step3.close": {
    th: "ใกล้เคียง",
    en: "Close",
  },
  "step3.wrong": {
    th: "ผิด",
    en: "Wrong",
  },
  "step3.accuracy": {
    th: "ความแม่นยำ",
    en: "Accuracy",
  },
  "step3.start_over": {
    th: "เริ่มใหม่",
    en: "Start Over",
  },
  "practice.select_piece": {
    th: "เลือกเพลง",
    en: "Select Piece",
  },
  "practice.record": {
    th: "บันทึก",
    en: "Record",
  },
  "practice.stop": {
    th: "หยุด",
    en: "Stop",
  },
  "practice.metronome": {
    th: "เมโทรนอม",
    en: "Metronome",
  },
  "practice.tempo": {
    th: "ความเร็ว",
    en: "Tempo",
  },
  "results.practice_again": {
    th: "ฝึกซ้อมอีกครั้ง",
    en: "Practice Again",
  },
  "results.feedback": {
    th: "ข้อเสนอแนะ",
    en: "Feedback",
  },
  "auth.signup": {
    th: "สมัครสมาชิก",
    en: "Sign Up",
  },
  "auth.login": {
    th: "เข้าสู่ระบบ",
    en: "Log In",
  },
  "auth.logout": {
    th: "ออกจากระบบ",
    en: "Log Out",
  },
  "profile.subscription": {
    th: "การสมัครสมาชิก",
    en: "Subscription",
  },
  "profile.free_tier": {
    th: "ฟรี",
    en: "Free",
  },
  "profile.paid_tier": {
    th: "สมาชิก",
    en: "Paid",
  },
  "profile.streak": {
    th: "วันติดต่อกัน",
    en: "Day Streak",
  },
  "profile.total_sessions": {
    th: "จำนวนครั้งที่ฝึก",
    en: "Total Sessions",
  },
  "error.mic_denied": {
    th: "ไมโครโฟนถูกปฏิเสธ",
    en: "Microphone access denied",
  },
  "error.mic_failed": {
    th: "ไม่สามารถเข้าถึงไมโครโฟนได้",
    en: "Cannot access microphone",
  },
  "error.retry": {
    th: "ลองอีกครั้ง",
    en: "Retry",
  },
  "error.invalid_file": {
    th: "กรุณาเลือกไฟล์ PDF หรือรูปภาพ",
    en: "Please select a PDF or image file",
  },
  "mic.ready": {
    th: "พร้อมบันทึก",
    en: "Ready to record",
  },
  "mic.recording": {
    th: "กำลังบันทึก...",
    en: "Recording...",
  },
};

// Global language hook
let globalLanguage: Language = "th";

export function setGlobalLanguage(lang: Language) {
  globalLanguage = lang;
  // Dispatch custom event to notify components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("languagechange", { detail: { language: lang } }));
  }
}

export function getGlobalLanguage(): Language {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("notedee-language");
      if (stored) {
        const data = JSON.parse(stored);
        const lang = data.language || "th";
        globalLanguage = lang;
        return lang;
      }
    } catch (e) {
      // Ignore
    }
  }
  return globalLanguage;
}

export function t(key: string, lang?: Language): string {
  const finalLang = lang || getGlobalLanguage();
  const translation = translations[key]?.[finalLang];
  if (!translation) {
    console.warn(`Translation missing for key: ${key} in language: ${finalLang}`);
    return key;
  }
  return translation;
}
