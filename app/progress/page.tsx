"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useProgressStore } from "@/store/progressStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, Calendar, TrendingUp, Music, Target, AlertCircle, CheckCircle2 } from "lucide-react";
import { t } from "@/lib/translations";
import { getImprovementHighlights, getWeeklyStrengthsAndWeaknesses, getPracticeRecommendations } from "@/lib/progressInsights";

export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    sessions,
    streak,
    getWeeklyStats,
    getMostPracticedSong,
    getSkillBreakdown,
    getWeakSpots,
  } = useProgressStore();

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
  const improvements = getImprovementHighlights(sessions);
  const { strength, weakness } = getWeeklyStrengthsAndWeaknesses(sessions);
  const recommendations = getPracticeRecommendations(sessions, mostPracticedSong, weakSpots);

  // Calculate total sessions
  const totalSessions = sessions.length;
  const averageAccuracy =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
      : 0;

  // Prepare chart data (last 7 days)
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
        : 0;
    chartData.push({
      date: dateStr,
      accuracy: Math.round(dayAccuracy),
      sessions: daySessions.length,
    });
  }

  const getSkillColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getSkillBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-8 text-3xl font-semibold text-foreground">Your Progress</h1>

      {/* Top Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">Practice Streak</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{streak}</div>
          <div className="mt-1 text-xs text-muted-foreground">days in a row</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Target className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Average Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {averageAccuracy.toFixed(0)}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">across all sessions</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Total Sessions</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{totalSessions}</div>
          <div className="mt-1 text-xs text-muted-foreground">practice sessions</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Music className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Most Practiced</span>
          </div>
          <div className="text-lg font-semibold text-foreground">
            {mostPracticedSong || "None yet"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">keep it up!</div>
        </div>
      </div>

      {/* Improvement Highlights */}
      {improvements.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-background p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5" />
            This Week&apos;s Highlights
          </h2>
          <div className="space-y-2">
            {improvements.map((highlight, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 rounded-md p-3 ${
                  highlight.type === "positive"
                    ? "bg-green-50 text-green-800"
                    : "bg-yellow-50 text-yellow-800"
                }`}
              >
                {highlight.type === "positive" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{highlight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Strengths and Weaknesses */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-foreground">This Week&apos;s Strength</h3>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm">{strength}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-foreground">Focus Area</h3>
          <div className="flex items-center gap-2 text-orange-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{weakness}</span>
          </div>
        </div>
      </div>

      {/* Skill Breakdown */}
      <div className="mb-8 rounded-lg border border-border bg-background p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Skill Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pitch / Intonation", value: skillBreakdown.pitch, key: "pitch" },
            { label: "Rhythm / Timing", value: skillBreakdown.rhythm, key: "rhythm" },
            { label: "Tone / Bow Control", value: skillBreakdown.tone, key: "tone" },
            { label: "Note Accuracy", value: skillBreakdown.noteAccuracy, key: "noteAccuracy" },
          ].map((skill) => (
            <div key={skill.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{skill.label}</span>
                <span className={`text-sm font-semibold ${getSkillColor(skill.value)}`}>
                  {skill.value}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full transition-all ${getSkillBgColor(skill.value)}`}
                  style={{ width: `${skill.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Spots */}
      {weakSpots.length > 0 && (
        <div className="mb-8 rounded-lg border border-border bg-background p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Areas to Improve</h2>
          <div className="space-y-3">
            {weakSpots.map((spot, idx) => (
              <div key={idx} className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-900">{spot.issue}</span>
                  <span className="text-xs text-orange-700">
                    {spot.frequency} time{spot.frequency > 1 ? "s" : ""}
                  </span>
                </div>
                {spot.measures.length > 0 && (
                  <div className="mt-1 text-xs text-orange-700">
                    Measures: {spot.measures.slice(0, 5).join(", ")}
                    {spot.measures.length > 5 && "..."}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Recommendations */}
      <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-900">
          <Target className="h-5 w-5" />
          Recommended Practice
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-blue-700">Song</div>
            <div className="text-sm font-semibold text-blue-900">{recommendations.suggestedSong}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-blue-700">Tempo</div>
            <div className="text-sm font-semibold text-blue-900">{recommendations.suggestedTempo} BPM</div>
          </div>
          <div>
            <div className="text-xs font-medium text-blue-700">Focus</div>
            <div className="text-sm font-semibold text-blue-900">{recommendations.suggestedFocus}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-blue-700">Duration</div>
            <div className="text-sm font-semibold text-blue-900">{recommendations.suggestedDuration} min</div>
          </div>
        </div>
      </div>

      {/* Accuracy Trend Chart */}
      {chartData.some((d) => d.sessions > 0) && (
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Accuracy Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9b9a97", fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#9b9a97", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e9e9e7",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#37352f"
                strokeWidth={2}
                dot={{ fill: "#37352f", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="rounded-lg border border-border bg-background p-12 text-center">
          <Music className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">Start Your Practice Journey</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Complete your first practice session to see your progress here.
          </p>
          <button
            onClick={() => router.push("/practice")}
            className="rounded-lg bg-foreground px-6 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Start Practicing
          </button>
        </div>
      )}
    </div>
  );
}
