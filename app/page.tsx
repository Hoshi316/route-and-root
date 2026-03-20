"use client";

import { useState, useEffect, useMemo} from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getActiveRoutes, getUserRouteSummary } from "@/lib/firestore";
import { RouteDoc } from "@/types/route";
import Link from "next/link";

type RawStep = {
  title: string;
  description: string;
  scheduledDay: number;
};

type EditableStep = RawStep & {
  _editing: boolean;
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
  recommendedDays: number;
  daysComment: string;
  goal: string;
  summary: string;
  steps: RawStep[];
};

type EditablePlan = Omit<Plan, "steps"> & {
  steps: EditableStep[];
};

type PlanResponse = {
  plans: Plan[];
  recommendedStyle: string;
  recommendationMessage: string;
};

type RouteWithId = RouteDoc & { id: string };

const styleConfig = {
  full_throttle: {
    bg: "border-red-300 bg-red-50",
    badge: "bg-red-100 text-red-700",
    meter: "bg-red-400",
    button: "bg-red-700 hover:bg-red-800",
    editBg: "bg-red-50 border-red-200",
  },
  wayfinder: {
    bg: "border-blue-300 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    meter: "bg-blue-400",
    button: "bg-blue-700 hover:bg-blue-800",
    editBg: "bg-blue-50 border-blue-200",
  },
  flow_state: {
    bg: "border-emerald-300 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    meter: "bg-emerald-400",
    button: "bg-emerald-700 hover:bg-emerald-800",
    editBg: "bg-emerald-50 border-emerald-200",
  },
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [goal, setGoal] = useState("");
  // durationDays を削除して、以下2行に置き換え
  const [durationValue, setDurationValue] = useState(7);
  const [durationUnit, setDurationUnit] = useState<"day" | "week" | "month">("day");

  const durationDays = useMemo(() => {
    if (durationUnit === "day")   return durationValue;
    if (durationUnit === "week")  return durationValue * 7;
    if (durationUnit === "month") return durationValue * 30;
    return durationValue;
  }, [durationValue, durationUnit]);
  const [currentLevel, setCurrentLevel] = useState("");
  const [constraints, setConstraints] = useState("");
  const [deepQuestion, setDeepQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editablePlans, setEditablePlans] = useState<EditablePlan[] | null>(null);
  const [recommendedStyle, setRecommendedStyle] = useState<string>("");
  const [recommendationMessage, setRecommendationMessage] = useState<string>("");
  const [activeRoutes, setActiveRoutes] = useState<RouteWithId[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [combinedMessage, setCombinedMessage] = useState("");




  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setRoutesLoading(true);
        try {
          const routes = await getActiveRoutes(currentUser.uid);
          const sorted = routes.sort((a, b) => {
            if (a.progress < 100 && b.progress === 100) return -1;
            if (a.progress === 100 && b.progress < 100) return 1;
            return 0;
          });
          setActiveRoutes(sorted.slice(0, 5));
        } catch (e) {
          console.error(e);
        } finally {
          setRoutesLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGenerate = async () => {
    // 「出発地」「旅の荷物」「長期の問い」を結合してmessageとして渡す
    const combined = [
    currentLevel ? `【現在地】${currentLevel}` : "",
    constraints ? `【制約・リソース】${constraints}` : "",
    deepQuestion ? `【この旅で本当に変えたいこと】${deepQuestion}` : "",
  ].filter(Boolean).join("\n");

  setCombinedMessage(combined); // stateに保存

  const res = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal, durationDays, message, userId: user.uid: combined, userHistory }),
  });
  };

  const toggleEditStep = (planStyle: string, stepIndex: number) => {
    setEditablePlans((prev) =>
      prev
        ? prev.map((plan) =>
            plan.style === planStyle
              ? {
                  ...plan,
                  steps: plan.steps.map((step, i) =>
                    i === stepIndex ? { ...step, _editing: !step._editing } : step
                  ),
                }
              : plan
          )
        : prev
    );
  };

  const updateStepField = (
    planStyle: string,
    stepIndex: number,
    field: keyof RawStep,
    value: string | number
  ) => {
    setEditablePlans((prev) =>
      prev
        ? prev.map((plan) =>
            plan.style === planStyle
              ? {
                  ...plan,
                  steps: plan.steps.map((step, i) =>
                    i === stepIndex ? { ...step, [field]: value } : step
                  ),
                }
              : plan
          )
        : prev
    );
  };

  const handleSelectPlan = async (plan: EditablePlan) => {
    if (!user) return;
    setSaving(true);
    try {
      const cleanSteps = plan.steps.map(({ _editing, ...rest }) => rest);
      const saveRes = await fetch("/api/save-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          goal: plan.goal,
          durationDays: plan.recommendedDays,
          message: combinedMessage,
          summary: plan.summary,
          steps: cleanSteps,
          hases: (plan as any).phases ?? [],
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
  <div className="min-h-screen bg-amber-50">
    {/* ── PC用サイドナビ ── */}
    <nav className="fixed left-0 top-0 hidden h-screen w-16 flex-col items-center gap-6 border-r border-orange-100 bg-white py-6 shadow-sm md:flex">
      <Link href="/" className="flex flex-col items-center gap-1 group">
        <span className="text-2xl">🏠</span>
        <span className="text-[9px] font-bold text-gray-400 group-hover:text-orange-500">ホーム</span>
      </Link>
      <Link href="/history" className="flex flex-col items-center gap-1 group">
        <span className="text-2xl">📜</span>
        <span className="text-[9px] font-bold text-gray-400 group-hover:text-orange-500">旅の記録</span>
      </Link>
      <div className="mt-auto flex flex-col items-center gap-1">
        <span className="text-2xl">🍎</span>
        <span className="text-[9px] font-bold text-orange-400">R&R</span>
      </div>
    </nav>

    {/* ── メインコンテンツ ── */}
    <main className="min-h-screen p-6 text-gray-800 md:pl-24">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-4xl font-bold">Route & Root</h1>
        <p className="mb-6 text-lg text-gray-600">
          目標を入力すると、AI が旅のしおりを作ってくれます。
        </p>
        <Header />

        {/* ── 新しい目標入力フォーム ── */}
        {!editablePlans && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-1 font-bold text-gray-700">✦ 新しい旅を始める</h2>
            <p className="mb-5 text-xs text-gray-400">旅の準備を整えるほど、AIのプランが精度を増します。</p>

            {/* 目的地 */}
            <div className="mb-4">
              <label className="mb-1 block font-semibold text-gray-700">
                🏔️ 目的地
                <span className="ml-2 text-xs font-normal text-gray-400">この旅の終わりに何ができるようになりたいですか？</span>
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-orange-400 focus:outline-none"
                placeholder="例：自分でモデルを訓練してkaggleに提出できる"
              />
            </div>

            {/* 出発地 */}
            <div className="mb-4">
              <label className="mb-1 block font-semibold text-gray-700">
                🧭 出発地
                <span className="ml-2 text-xs font-normal text-gray-400">いま、どのあたりにいますか？</span>
              </label>
              <input
                type="text"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-orange-400 focus:outline-none"
                placeholder="例：Pythonは書けるが機械学習は未経験"
              />
            </div>

            {/* 旅の荷物 */}
            <div className="mb-4">
              <label className="mb-1 block font-semibold text-gray-700">
                🎒 旅の荷物
                <span className="ml-2 text-xs font-normal text-gray-400">使える時間や制約はありますか？</span>
              </label>
              <input
                type="text"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-orange-400 focus:outline-none"
                placeholder="例：平日1時間・土日3時間。数学は苦手"
              />
            </div>

            {/* 期間 */}
            <div className="mb-4">
              <label className="mb-1 block font-semibold text-gray-700">⏳ 期間</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 p-3 focus:border-orange-400 focus:outline-none"
                  min={1}
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as "day" | "week" | "month")}
                  className="flex-1 rounded-lg border border-gray-300 bg-white p-3 focus:border-orange-400 focus:outline-none"
                >
                  <option value="day">日</option>
                  <option value="week">週</option>
                  <option value="month">ヶ月</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-400">= {durationDays} 日間</p>
            </div>

            {/* 長期目標の追加質問（30日以上の時だけ表示） */}
            {durationDays >= 30 && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-800">🧭 長い旅ですね。一つだけ聞かせてください。</p>
                <p className="mt-1 text-xs text-amber-600">
                  この旅が終わった時、何が変わっていてほしいですか？
                </p>
                <textarea
                  value={deepQuestion}
                  onChange={(e) => setDeepQuestion(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm focus:outline-none"
                  rows={2}
                  placeholder="例：転職できている、副業で月3万稼げている、自信を持って話せるようになっている..."
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !goal || !user}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white disabled:opacity-50 transition hover:bg-orange-600"
            >
              {loading ? "旅のプランを生成中..." : !user ? "ログインしてください" : "旅の準備をする ✦"}
            </button>
            {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>
        )}

        {/* ── 進行中の旅（カルーセル） ── */}
        {user && !editablePlans && (
          <div className="mt-6">
            {routesLoading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : activeRoutes.filter(r => r.progress < 100).length > 0 ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-gray-700">🚶 進行中の旅</h2>
                  <Link href="/history" className="text-xs text-orange-400 underline">
                    すべて見る →
                  </Link>
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2"
                  style={{ scrollSnapType: "x mandatory" }}
                >
                  {activeRoutes
                    .filter(r => r.progress < 100)
                    .slice(0, 5)
                    .map((route) => {
                      const completedCount = route.steps.filter((s) => s.done).length;
                      return (
                        <div
                          key={route.id}
                          className="shrink-0 w-64 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm"
                          style={{ scrollSnapAlign: "start" }}
                        >
                          <p className="mb-2 text-sm font-bold text-gray-800 line-clamp-2 leading-snug">
                            {route.goal}
                          </p>
                          <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-orange-400 transition-all"
                              style={{ width: `${route.progress}%` }}
                            />
                          </div>
                          <p className="mb-3 text-xs text-gray-400">
                            {completedCount}/{route.steps.length} ステップ完了　{route.progress}%
                          </p>
                          <div className="flex gap-2">
                            <Link
                              href={`/map/${route.id}`}
                              className="flex-1 rounded-lg bg-orange-500 py-1.5 text-center text-xs font-bold text-white transition hover:bg-orange-600"
                            >
                              🗺️ マップ
                            </Link>
                            <Link
                              href={`/garden/${route.id}`}
                              className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-center text-xs font-bold text-white transition hover:bg-emerald-600"
                            >
                              🍎 農園
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-4 text-center">
                <p className="text-sm text-gray-400">進行中の旅はありません</p>
                <Link href="/history" className="mt-1 inline-block text-xs text-orange-400 underline">
                  過去の旅を見る
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── プラン選択・プレ編集カード ── */}
        {editablePlans && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">どのルートで旅しますか？</h2>
              <button onClick={() => setEditablePlans(null)} className="text-sm text-gray-500 underline">
                ← 入力に戻る
              </button>
            </div>

            {recommendationMessage && (
              <div className="mb-6 rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <span className="text-sm font-bold text-orange-600">AIコーチからのアドバイス</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{recommendationMessage}</p>
              </div>
            )}

            <div className="space-y-6">
              {editablePlans.map((plan) => {
                const config = styleConfig[plan.style];
                const diff = plan.recommendedDays - durationDays;
                return (
                  <div key={plan.style} className={`rounded-2xl border-2 p-6 ${config.bg}`}>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-3xl">{plan.styleEmoji}</span>
                        <span className={`rounded-full px-3 py-1 text-sm font-bold ${config.badge}`}>
                          {plan.styleLabel}
                        </span>
                        {plan.style === recommendedStyle && (
                          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-yellow-900 shadow-sm">
                            ✦ Most Suitable
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="mr-1 text-xs text-gray-400">気合度</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className={`h-2 w-4 rounded-full ${n <= plan.intensityLevel ? config.meter : "bg-gray-200"}`} />
                        ))}
                      </div>
                    </div>

                    <p className="mb-1 text-lg font-bold text-gray-800">"{plan.philosophy}"</p>
                    <p className={`mb-4 text-sm font-semibold ${config.badge.split(" ")[1]}`}>{plan.tagline}</p>

                    <div className="mb-4 flex items-center gap-3">
                      <div className={`rounded-xl px-4 py-2 text-center ${config.badge}`}>
                        <p className="text-xs font-semibold opacity-70">AI提案期間</p>
                        <p className="text-2xl font-black">{plan.recommendedDays}<span className="text-sm font-normal">日</span></p>
                      </div>
                      <div className="flex-1">
                        {diff < 0 && <p className="text-sm font-bold text-red-600">⚡ 希望より{Math.abs(diff)}日短縮</p>}
                        {diff === 0 && <p className="text-sm font-bold text-blue-600">🧭 希望通りの期間</p>}
                        {diff > 0 && <p className="text-sm font-bold text-emerald-600">🌊 希望より{diff}日ゆとりを持たせます</p>}
                        <p className="mt-1 text-xs italic text-gray-500">{plan.daysComment}</p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-1 rounded-xl bg-white/60 p-3 text-sm">
                      <p className="text-gray-600"><span className="font-semibold">👤 向いている人：</span>{plan.suitableFor}</p>
                      <p className="italic text-gray-500"><span className="font-semibold not-italic">⚖️ トレードオフ：</span>{plan.tradeoff}</p>
                    </div>

                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-bold text-gray-500">✏️ ステップを編集できます（保存前に調整可）</p>
                      {plan.steps.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className={`rounded-xl border p-3 min-h-[80px] flex flex-col justify-between ${config.editBg}`}
                        >
                          {step._editing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 text-xs font-bold text-gray-500">Day</span>
                                <input
                                  type="number"
                                  value={step.scheduledDay}
                                  min={1}
                                  max={plan.recommendedDays}
                                  onChange={(e) => updateStepField(plan.style, stepIndex, "scheduledDay", Number(e.target.value))}
                                  className="w-16 rounded-lg border border-gray-300 bg-white p-1 text-center text-sm font-bold focus:outline-none"
                                />
                              </div>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateStepField(plan.style, stepIndex, "title", e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-bold focus:outline-none"
                                placeholder="ステップのタイトル"
                              />
                              <textarea
                                value={step.description}
                                onChange={(e) => updateStepField(plan.style, stepIndex, "description", e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs focus:outline-none"
                                rows={2}
                                placeholder="ステップの説明"
                              />
                              <button
                                onClick={() => toggleEditStep(plan.style, stepIndex)}
                                className="rounded-lg bg-gray-700 px-3 py-1 text-xs font-bold text-white"
                              >
                                確定
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-400">Day {step.scheduledDay}</p>
                                <p className="text-sm font-bold text-gray-800 truncate">{step.title}</p>
                                <div className="group relative">
                                  <p className="text-xs text-gray-500 line-clamp-2">{step.description}</p>
                                  {step.description.length > 40 && (
                                    <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-xl group-hover:block animate-in fade-in zoom-in duration-200">
                                      {step.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => toggleEditStep(plan.style, stepIndex)}
                                className="shrink-0 rounded-lg bg-white/80 px-2 py-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

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
  </div>
);
}