"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Flame, Calendar } from "lucide-react";
import { t } from "@/lib/translations";

// Mock data - in production, this would come from API
const mockHistory = [
  { date: "2024-01-01", sessions: 2, averageAccuracy: 75, totalMinutes: 30 },
  { date: "2024-01-02", sessions: 3, averageAccuracy: 80, totalMinutes: 45 },
  { date: "2024-01-03", sessions: 1, averageAccuracy: 82, totalMinutes: 20 },
  { date: "2024-01-04", sessions: 2, averageAccuracy: 78, totalMinutes: 35 },
  { date: "2024-01-05", sessions: 4, averageAccuracy: 85, totalMinutes: 60 },
  { date: "2024-01-06", sessions: 2, averageAccuracy: 88, totalMinutes: 40 },
  { date: "2024-01-07", sessions: 3, averageAccuracy: 90, totalMinutes: 50 },
];

export default function ProgressPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const streak = 7;
  const totalSessions = mockHistory.reduce((sum, day) => sum + day.sessions, 0);
  const averageAccuracy =
    mockHistory.reduce((sum, day) => sum + day.averageAccuracy, 0) /
    mockHistory.length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-semibold">{t("nav.progress")}</h1>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Flame className="h-5 w-5" />
            <span className="text-sm">{t("profile.streak")}</span>
          </div>
          <div className="text-3xl font-bold">{streak}</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">{t("profile.total_sessions")}</span>
          </div>
          <div className="text-3xl font-bold">{totalSessions}</div>
        </div>

        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-2 text-sm text-muted">ความแม่นยำเฉลี่ย</div>
          <div className="text-3xl font-bold">{averageAccuracy.toFixed(0)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Accuracy Trend */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">แนวโน้มความแม่นยำ</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockHistory}>
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
                dataKey="averageAccuracy"
                stroke="#37352f"
                strokeWidth={2}
                dot={{ fill: "#37352f", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Practice Sessions */}
        <div className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-4 text-lg font-semibold">จำนวนครั้งที่ฝึก</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9e9e7" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9b9a97", fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fill: "#9b9a97", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e9e9e7",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="sessions" fill="#37352f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

