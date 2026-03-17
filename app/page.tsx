"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

type RawStep = {
  title: string;
  description: string;
  scheduledDay: number;
};

type Plan = {
  style: "full_throttle" | "wayfinder" | "flow_state";
  styleLabel: string;
  styleEmoji: string;
  philosophy: string;
  tagline: string;
  suitableFor: string;
  tradeoff: string;
  intensityLevel: number;
  goal: string;
  summary: string;
  steps: RawStep[];
};

const styleConfig = {
  full_throttle: {
    bg: "border-red-300 bg-red-50",
    badge: "bg-red-100 text-red-700",
    meter: "bg-red-400",
    button: "bg-red-700 hover:bg-red-800",
  },
  wayfinder: {
    bg: "border-blue-300 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    meter: "bg-blue-400",
    button: "bg-blue-700 hover:bg-blue-800",
  },
  flow_state: {
    bg: "border-emerald-300 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    meter: "bg-emerald-400",
    button: "bg-emerald-700 hover:bg-emerald-800",
  },
};



export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Step1: Geminiで3プラン生成
  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    setPlans(null);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, durationDays, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "プラン生成に失敗しました");
      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // Step2: プランを選んでFirestoreに保存→遷移
  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;
    setSaving(true);

    try {
      const saveRes = await fetch("/api/save-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          goal: plan.goal,
          durationDays,
          message,
          summary: plan.summary,
          steps: plan.steps,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "保存に失敗しました");
      router.push(`/map/${saveData.routeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-amber-50 p-8 text-gray-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold">Route & Root</h1>
        <p className="mb-8 text-lg">目標を入力すると、AI が旅のしおりを作ってくれます。</p>
        <Header />

        {/* 入力フォーム（プラン未生成時のみ表示） */}
        {!plans && (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <div className="mb-4">
              <label className="mb-2 block font-semibold">目標</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3"
                placeholder="例：統計のテストに合格する"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block font-semibold">何日で達成したい？</label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 p-3"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block font-semibold">自分への一言</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3"
                rows={3}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !goal || !user}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "3つのプランを生成中..." : !user ? "ログインしてください" : "プランを見る"}
            </button>
            {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>
        )}

        {/* プラン選択カード */}
        {plans && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">どのルートで旅しますか？</h2>
              <button
                onClick={() => setPlans(null)}
                className="text-sm text-gray-500 underline"
              >
                ← 入力に戻る
              </button>
            </div>

            <div className="space-y-4">
              {plans.map((plan) => {
  const config = styleConfig[plan.style];
  return (
    <div key={plan.style} className={`rounded-2xl border-2 p-6 ${config.bg}`}>

      {/* ヘッダー：名前 + 気合度メーター */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{plan.styleEmoji}</span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${config.badge}`}>
            {plan.styleLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-gray-400">気合度</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`h-2 w-4 rounded-full transition-all ${
                n <= plan.intensityLevel ? config.meter : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 哲学 */}
      <p className="mb-1 text-lg font-bold text-gray-800">
        "{plan.philosophy}"
      </p>

      {/* キャッチコピー */}
      <p className={`mb-4 text-sm font-semibold ${config.badge.split(" ")[1]}`}>
        {plan.tagline}
      </p>

      {/* 期間バッジ */}
{(() => {
  const diff = plan.recommendedDays - durationDays;
  const isShort  = diff < 0;
  const isSame   = diff === 0;

  return (
    <div className="mb-4 flex items-center gap-3">
      {/* 最適期間 */}
      <div className={`rounded-xl px-4 py-2 text-center ${config.badge}`}>
        <p className="text-xs font-semibold opacity-70">AI提案期間</p>
        <p className="text-2xl font-black">{plan.recommendedDays}<span className="text-sm font-normal">日</span></p>
      </div>

      {/* 差分コメント */}
      <div className="flex-1">
        {isShort && (
          <p className="text-sm font-bold text-red-600">
            ⚡ 希望より{Math.abs(diff)}日短縮
          </p>
        )}
        {isSame && (
          <p className="text-sm font-bold text-blue-600">
            🧭 希望通りの期間
          </p>
        )}
        {!isShort && !isSame && (
          <p className="text-sm font-bold text-emerald-600">
            🌊 希望より{diff}日ゆとりを持たせます
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 italic">
          {plan.daysComment}
        </p>
      </div>
    </div>
  );
})()}

      {/* こんな人向け・トレードオフ */}
      <div className="mb-4 space-y-1 rounded-xl bg-white/60 p-3 text-sm">
        <p className="text-gray-600">
          <span className="font-semibold">👤 向いている人：</span>
          {plan.suitableFor}
        </p>
        <p className="text-gray-500 italic">
          <span className="font-semibold not-italic">⚖️ トレードオフ：</span>
          {plan.tradeoff}
        </p>
      </div>

      {/* ステップ一覧（折りたたみ） */}
      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
          ステップを確認する（{plan.steps.length}個）
        </summary>
        <div className="mt-2 space-y-1 pl-2">
          {plan.steps.map((step, i) => (
            <p key={i} className="text-sm text-gray-600">
              <span className="font-semibold">Day{step.scheduledDay}</span>{"　"}
              {step.title}
            </p>
          ))}
        </div>
      </details>

      <button
        onClick={() => handleSelectPlan(plan)}
        disabled={saving}
        className={`w-full rounded-xl py-3 font-bold text-white transition ${config.button} disabled:opacity-50`}
      >
        {saving ? "準備中..." : "このルートで旅を始める →"}
      </button>
    </div>
  );
})}
            </div>
            {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}