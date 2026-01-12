"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { useLanguageStore } from "@/store/languageStore";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Flame, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Play } from "lucide-react";
import { getWeeklyStrengthsAndWeaknesses, getPracticeRecommendations } from "@/lib/progressInsights";
import { t } from "@/lib/translations";

export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { language, initialize } = useLanguageStore();
  const {
    sessions,
    streak,
    getWeeklyStats,
    getMostPracticedSong,
    getSkillBreakdown,
    getWeakSpots,
  } = useProgressStore();
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const weeklyStats = getWeeklyStats();
  const mostPracticedSong = getMostPracticedSong();
  const skillBreakdown = getSkillBreakdown();
  const weakSpots = getWeakSpots();
  const { strength, weakness } = getWeeklyStrengthsAndWeaknesses(sessions);
  const recommendations = getPracticeRecommendations(sessions, mostPracticedSong, weakSpots);

  // Calculate trend indicator
  const getTrendIndicator = () => {
    if (sessions.length < 2) return { type: "steady", label: t("progress.getting_started", language), icon: Minus };
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeekSessions = sessions.filter((s) => new Date(s.startedAt) >= weekAgo);
    const lastWeekSessions = sessions.filter(
      (s) => {
        const sessionDate = new Date(s.startedAt);
        return sessionDate >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && sessionDate < weekAgo;
      }
    );

    if (thisWeekSessions.length === 0) {
      return { type: "needs_focus", label: t("progress.needs_focus", language), icon: TrendingDown };
    }

    const thisWeekAccuracy = thisWeekSessions.length > 0
      ? thisWeekSessions.reduce((sum, s) => sum + s.accuracy, 0) / thisWeekSessions.length
      : 0;
    const lastWeekAccuracy = lastWeekSessions.length > 0
      ? lastWeekSessions.reduce((sum, s) => sum + s.accuracy, 0) / lastWeekSessions.length
      : thisWeekAccuracy;

    const accuracyChange = thisWeekAccuracy - lastWeekAccuracy;
    
    if (accuracyChange > 3) {
      return { type: "improving", label: t("progress.improving", language), icon: TrendingUp };
    } else if (accuracyChange < -3) {
      return { type: "needs_focus", label: t("progress.needs_focus", language), icon: TrendingDown };
    } else {
      return { type: "steady", label: t("progress.steady", language), icon: Minus };
    }
  };

  const trend = getTrendIndicator();

  // Prepare simplified chart data (last 7 days)
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const daySessions = sessions.filter(
      (s) => new Date(s.startedAt).toISOString().split("T")[0] === dateStr
    );
    const dayAccuracy =
      daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + s.accuracy, 0) / daySessions.length
        : null;
    chartData.push({
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      accuracy: dayAccuracy !== null ? Math.round(dayAccuracy) : null,
    });
  }

  const handleStartPractice = () => {
    router.push("/practice");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Page Title */}
      <h1 className="mb-12 text-2xl font-light text-foreground">{t("progress.title", language)}</h1>

      {/* This Week's Practice Summary */}
      <div className="mb-10 rounded-lg bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-lg font-medium text-gray-700">{t("progress.this_week", language)}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm text-gray-500 mb-1">{t("progress.sessions", language)}</div>
            <div className="text-4xl font-light text-gray-900">{weeklyStats.sessions}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{t("progress.streak", language)}</div>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              <span className="text-4xl font-light text-gray-900">{streak}</span>
              <span className="text-sm text-gray-500">{t("progress.days", language)}</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">{t("progress.trend", language)}</div>
            <div className="flex items-center gap-2">
              {trend.type === "improving" && <TrendingUp className="h-5 w-5 text-green-500" />}
              {trend.type === "needs_focus" && <TrendingDown className="h-5 w-5 text-amber-500" />}
              {trend.type === "steady" && <Minus className="h-5 w-5 text-gray-400" />}
              <span className={`text-lg font-medium ${
                trend.type === "improving" ? "text-green-600" :
                trend.type === "needs_focus" ? "text-amber-600" :
                "text-gray-600"
              }`}>
                {trend.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Small Cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-green-50 p-6 border border-green-100">
          <div className="text-xs font-medium text-green-700 mb-2">{t("progress.strength", language)}</div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-base text-green-900">{strength}</span>
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-6 border border-amber-100">
          <div className="text-xs font-medium text-amber-700 mb-2">{t("progress.focus_next", language)}</div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="text-base text-amber-900">{weakness}</span>
          </div>
        </div>
      </div>

      {/* Recommended Practice Card */}
      <div className="mb-10 rounded-lg bg-blue-50 p-8 border border-blue-100">
        <h2 className="mb-6 text-lg font-medium text-blue-900">{t("progress.recommended", language)}</h2>
        <div className="space-y-4 mb-6">
          <div>
            <div className="text-xs font-medium text-blue-700 mb-1">{t("progress.song", language)}</div>
            <div className="text-xl font-light text-blue-900">{recommendations.suggestedSong}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-blue-700 mb-1">{t("progress.suggested_tempo", language)}</div>
              <div className="text-base text-blue-900">{recommendations.suggestedTempo} BPM</div>
            </div>
            <div>
              <div className="text-xs font-medium text-blue-700 mb-1">{t("progress.focus_goal", language)}</div>
              <div className="text-base text-blue-900">{recommendations.suggestedFocus}</div>
            </div>
          </div>
        </div>
        <button
          onClick={handleStartPractice}
          className="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-medium text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="h-5 w-5" />
          {t("progress.start_practice", language)}
        </button>
      </div>

      {/* Simplified 7-Day Accuracy Trend */}
      {chartData.some((d) => d.accuracy !== null) && (
        <div className="mb-10 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-700">{t("progress.accuracy_trend", language)}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tick={{ fill: "#9b9a97", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fill: "#9b9a97", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#4a90e2"
                strokeWidth={2}
                dot={{ fill: "#4a90e2", r: 3 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Collapsible Detailed Analysis */}
      <div className="mb-8">
        <button
          onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
          className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">{t("progress.view_details", language)}</span>
          {showDetailedAnalysis ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {showDetailedAnalysis && (
          <div className="mt-4 space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            {/* Skill Breakdown */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-gray-700">{t("progress.skill_breakdown", language)}</h3>
              <div className="space-y-3">
                {[
                  { label: t("progress.pitch", language), value: skillBreakdown.pitch, key: "pitch" },
                  { label: t("progress.rhythm", language), value: skillBreakdown.rhythm, key: "rhythm" },
                  { label: t("progress.tone", language), value: skillBreakdown.tone, key: "tone" },
                  { label: t("progress.note_accuracy", language), value: skillBreakdown.noteAccuracy, key: "noteAccuracy" },
                ].map((skill) => (
                  <div key={skill.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{skill.label}</span>
                      <span className="text-sm font-medium text-gray-900">{Math.round(skill.value)}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-blue-400 transition-all"
                        style={{ width: `${skill.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Spots */}
            {weakSpots.length > 0 && (
              <div>
                <h3 className="mb-4 text-sm font-medium text-gray-700">{t("progress.areas_improve", language)}</h3>
                <div className="space-y-2">
                  {weakSpots.map((spot, idx) => (
                    <div key={idx} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <div className="text-sm text-gray-700">{spot.issue}</div>
                      {spot.measures.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          {t("progress.measures", language)} {spot.measures.slice(0, 5).join(", ")}
                          {spot.measures.length > 5 && "..."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Stats */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-gray-700">{t("progress.additional_stats", language)}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">{t("progress.total_sessions", language)}</div>
                  <div className="text-lg font-medium text-gray-900">{sessions.length}</div>
                </div>
                <div>
                  <div className="text-gray-500">{t("progress.most_practiced", language)}</div>
                  <div className="text-lg font-medium text-gray-900">{mostPracticedSong || t("progress.none_yet", language)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mb-4 text-gray-400">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t("progress.start_journey", language)}</h3>
          <p className="mb-6 text-sm text-gray-500">
            {t("progress.first_session", language)}
          </p>
          <button
            onClick={handleStartPractice}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t("progress.start_practicing", language)}
          </button>
        </div>
      )}
    </div>
  );
}
