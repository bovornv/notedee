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
  "results.streak": {
    th: "วันติดต่อกัน",
    en: "day streak",
  },
  "results.streaks": {
    th: "วันติดต่อกัน",
    en: "days streak",
  },
  "results.accuracy": {
    th: "ความแม่นยำ",
    en: "accuracy",
  },
  "results.correct": {
    th: "ถูกต้อง",
    en: "Correct",
  },
  "results.close": {
    th: "ใกล้เคียง",
    en: "Close",
  },
  "results.wrong": {
    th: "ผิด",
    en: "Wrong",
  },
  "results.lets_work_on": {
    th: "มาฝึกเรื่องนี้กัน:",
    en: "Let's work on:",
  },
  "results.view_progress": {
    th: "ดูความก้าวหน้า",
    en: "View Progress",
  },
  "results.practice_sections": {
    th: "ฝึกส่วนเหล่านี้",
    en: "Practice These Sections",
  },
  "results.focus_measures": {
    th: "เน้นที่ห้องเหล่านี้เพื่อปรับปรุงความแม่นยำโดยรวม:",
    en: "Focus on these measures to improve your overall accuracy:",
  },
  "results.measure": {
    th: "ห้อง",
    en: "Measure",
  },
  "results.practice": {
    th: "ฝึก",
    en: "Practice",
  },
  "results.practice_full_piece": {
    th: "ฝึกทั้งเพลงอีกครั้ง",
    en: "Practice Full Piece Again",
  },
  "results.practice_tips": {
    th: "เคล็ดลับการฝึกซ้อม",
    en: "Practice Tips",
  },
  "results.tip_slow_tempo": {
    th: "ฝึกด้วยความเร็วที่ช้าลง—ความเร็วจะมาอย่างเป็นธรรมชาติ",
    en: "Practice at a slower tempo—speed will come naturally",
  },
  "results.tip_one_measure": {
    th: "เน้นทีละห้องก่อนที่จะไปต่อ",
    en: "Focus on one measure at a time before moving forward",
  },
  "results.tip_doing_well": {
    th: "คุณทำได้ดี! ลองฝึกส่วนที่ยากแยกต่างหาก",
    en: "You're doing well! Try practicing difficult sections separately",
  },
  "results.tip_metronome": {
    th: "ใช้เมโทรนอมเพื่อช่วยรักษาจังหวะให้สม่ำเสมอ",
    en: "Use the metronome to help maintain steady rhythm",
  },
  "results.tip_excellent": {
    th: "ก้าวหน้าที่ยอดเยี่ยม! ลองเพิ่มความเร็วทีละน้อย",
    en: "Excellent progress! Try increasing the tempo gradually",
  },
  "results.tip_expression": {
    th: "เน้นการแสดงออกทางดนตรีและไดนามิก",
    en: "Focus on musical expression and dynamics",
  },
  "results.tip_rhythm": {
    th: "เคาะจังหวะก่อนเล่นเพื่อให้จังหวะอยู่ในใจ",
    en: "Tap the rhythm before playing to internalize the timing",
  },
  "results.tip_intonation": {
    th: "ฟังแต่ละโน้ตอย่างระมัดระวัง—การเล่นให้ตรงเสียงจะดีขึ้นด้วยการฟังอย่างมีสมาธิ",
    en: "Listen carefully to each note—intonation improves with focused listening",
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
  "profile.nickname": {
    th: "ชื่อเล่น",
    en: "Nickname",
  },
  "profile.instrument": {
    th: "เครื่องดนตรี",
    en: "Instrument",
  },
  "profile.violin": {
    th: "ไวโอลิน",
    en: "Violin",
  },
  "profile.language": {
    th: "ภาษา",
    en: "Language",
  },
  "profile.upgrade_desc": {
    th: "อัปเกรดเป็นสมาชิกเพื่อฝึกซ้อมได้ไม่จำกัดและรับข้อเสนอแนะแบบละเอียด",
    en: "Upgrade to premium to practice unlimited times and get detailed feedback",
  },
  "profile.upgrade_button": {
    th: "อัปเกรดเป็นสมาชิก",
    en: "Upgrade to Premium",
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
  "progress.title": {
    th: "ความก้าวหน้าของคุณ",
    en: "Your Progress",
  },
  "progress.this_week": {
    th: "การฝึกซ้อมสัปดาห์นี้",
    en: "This Week's Practice",
  },
  "progress.sessions": {
    th: "จำนวนครั้ง",
    en: "Sessions",
  },
  "progress.streak": {
    th: "วันติดต่อกัน",
    en: "Practice Streak",
  },
  "progress.days": {
    th: "วัน",
    en: "days",
  },
  "progress.trend": {
    th: "แนวโน้ม",
    en: "Trend",
  },
  "progress.getting_started": {
    th: "เริ่มต้น",
    en: "Getting started",
  },
  "progress.improving": {
    th: "กำลังดีขึ้น",
    en: "Improving",
  },
  "progress.steady": {
    th: "ก้าวหน้าอย่างสม่ำเสมอ",
    en: "Steady progress",
  },
  "progress.needs_focus": {
    th: "ต้องให้ความสนใจ",
    en: "Needs focus",
  },
  "progress.strength": {
    th: "จุดแข็งของคุณในสัปดาห์นี้",
    en: "Your strength this week",
  },
  "progress.focus_next": {
    th: "ควรเน้น",
    en: "Focus next",
  },
  "progress.recommended": {
    th: "แนะนำการฝึกซ้อม",
    en: "Recommended Practice",
  },
  "progress.song": {
    th: "เพลง",
    en: "Song",
  },
  "progress.suggested_tempo": {
    th: "ความเร็วที่แนะนำ",
    en: "Suggested Tempo",
  },
  "progress.focus_goal": {
    th: "เป้าหมายการฝึก",
    en: "Focus Goal",
  },
  "progress.start_practice": {
    th: "เริ่มฝึกซ้อม",
    en: "Start Practice",
  },
  "progress.accuracy_trend": {
    th: "แนวโน้มความแม่นยำ 7 วัน",
    en: "7-Day Accuracy Trend",
  },
  "progress.view_details": {
    th: "ดูการวิเคราะห์แบบละเอียด",
    en: "View detailed analysis",
  },
  "progress.skill_breakdown": {
    th: "การแบ่งทักษะ",
    en: "Skill Breakdown",
  },
  "progress.pitch": {
    th: "ระดับเสียง / การเล่นให้ตรงเสียง",
    en: "Pitch / Intonation",
  },
  "progress.rhythm": {
    th: "จังหวะ / การจับเวลา",
    en: "Rhythm / Timing",
  },
  "progress.tone": {
    th: "เสียง / การควบคุมคันชัก",
    en: "Tone / Bow Control",
  },
  "progress.note_accuracy": {
    th: "ความแม่นยำของโน้ต",
    en: "Note Accuracy",
  },
  "progress.areas_improve": {
    th: "จุดที่ควรปรับปรุง",
    en: "Areas to Improve",
  },
  "progress.measures": {
    th: "ห้อง:",
    en: "Measures:",
  },
  "progress.additional_stats": {
    th: "สถิติเพิ่มเติม",
    en: "Additional Statistics",
  },
  "progress.total_sessions": {
    th: "จำนวนครั้งทั้งหมด",
    en: "Total Sessions",
  },
  "progress.most_practiced": {
    th: "ฝึกซ้อมมากที่สุด",
    en: "Most Practiced",
  },
  "progress.none_yet": {
    th: "ยังไม่มี",
    en: "None yet",
  },
  "progress.start_journey": {
    th: "เริ่มต้นการฝึกซ้อมของคุณ",
    en: "Start Your Practice Journey",
  },
  "progress.first_session": {
    th: "ทำการฝึกซ้อมครั้งแรกเพื่อดูความก้าวหน้าของคุณที่นี่",
    en: "Complete your first practice session to see your progress here.",
  },
  "progress.start_practicing": {
    th: "เริ่มฝึกซ้อม",
    en: "Start Practicing",
  },
  "practice.start_session": {
    th: "เริ่มการฝึกซ้อม",
    en: "Start a Practice Session",
  },
  "practice.subtitle": {
    th: "ใช้เวลา 5–10 นาที ไม่ต้องกังวล",
    en: "Takes 5–10 minutes. No pressure.",
  },
  "practice.student_mode": {
    th: "โหมดนักเรียน",
    en: "Student Mode",
  },
  "practice.advanced_mode": {
    th: "โหมดขั้นสูง",
    en: "Advanced Mode",
  },
  "practice.recommended": {
    th: "แนะนำสำหรับคุณ",
    en: "Recommended for You",
  },
  "practice.start_practice": {
    th: "เริ่มฝึกซ้อม",
    en: "Start Practice",
  },
  "practice.explore": {
    th: "สำรวจเพลงสาธารณะ",
    en: "Explore Public Music",
  },
  "practice.explore_desc": {
    th: "เรียกดูคลังเพลงทั้งหมด",
    en: "Browse our full library",
  },
  "practice.upload": {
    th: "อัปโหลดโน้ตเพลงของคุณ",
    en: "Upload Your Own Sheet Music",
  },
  "practice.upload_desc": {
    th: "ไฟล์ PDF หรือรูปภาพ",
    en: "PDF or image files",
  },
  "practice.what_next": {
    th: "จะเกิดอะไรขึ้นต่อไป?",
    en: "What happens next?",
  },
  "practice.countdown": {
    th: "นับถอยหลัง 3-2-1",
    en: "3-2-1 Countdown",
  },
  "practice.countdown_desc": {
    th: "เตรียมพร้อมที่จะเล่น",
    en: "Get ready to play",
  },
  "practice.play_music": {
    th: "เล่นเพลงของคุณ",
    en: "Play Your Music",
  },
  "practice.play_music_desc": {
    th: "ทำตามเส้นแนวทางสีแดงขณะที่คุณเล่น",
    en: "Follow the red guide line as you play",
  },
  "practice.get_feedback": {
    th: "รับข้อเสนอแนะ",
    en: "Get Feedback",
  },
  "practice.get_feedback_desc": {
    th: "ดูว่าคุณทำได้อย่างไรและควรฝึกอะไรต่อไป",
    en: "See how you did and what to practice next",
  },
  "practice.change": {
    th: "เปลี่ยน",
    en: "Change",
  },
  "practice.settings": {
    th: "การตั้งค่า",
    en: "Settings",
  },
  "practice.feedback_mode": {
    th: "โหมดข้อเสนอแนะ",
    en: "Feedback Mode",
  },
  "practice.practice_mode": {
    th: "โหมดการฝึกซ้อม",
    en: "Practice Mode",
  },
  "practice.calm_feedback": {
    th: "เงียบสงบ",
    en: "Calm",
  },
  "practice.practice_feedback": {
    th: "ฝึกซ้อม",
    en: "Practice",
  },
  "practice.normal_mode": {
    th: "ปกติ",
    en: "Normal",
  },
  "practice.accuracy_mode": {
    th: "ความแม่นยำ",
    en: "Accuracy",
  },
  "practice.rhythm_mode": {
    th: "จังหวะ",
    en: "Rhythm",
  },
  "explore.search_placeholder": {
    th: "ค้นหาเพลง...",
    en: "Search songs...",
  },
  "explore.no_songs": {
    th: "ไม่พบเพลงที่ค้นหา",
    en: "No songs found",
  },
  "explore.no_songs_desc": {
    th: "ลองค้นหาด้วยคำอื่นหรืออัปโหลดโน้ตเพลงของคุณเองด้านบน",
    en: "Try a different search term or upload your own sheet music above.",
  },
  "explore.open": {
    th: "เปิด",
    en: "Open",
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
