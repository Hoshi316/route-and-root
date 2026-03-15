"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 案内役（ルーター）を呼びます

export default function Home() {
  const router = useRouter(); // 画面移動のための魔法使いです
  const [goal, setGoal] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Gemini AI にプランを作ってもらう
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, durationDays, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "プラン生成に失敗しました");

      // 2. 作ってもらったプランを Firestore に保存する
      const mockUserId = "demo-user"; // お嬢様、これが「仮の名前」でございます
      const saveRes = await fetch("/api/save-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mockUserId,
          goal,
          durationDays,
          message,
          summary: data.summary,
          steps: data.steps,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || "保存に失敗しました");

      // 3. 保存に成功したら、そのプラン専用のページへ移動する！
      router.push(`/map/${saveData.routeId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setLoading(false); // エラーの時だけ loading を解除します
    }
  };

  return (
    <main className="min-h-screen bg-amber-50 p-8 text-gray-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold">Route & Root</h1>
        <p className="mb-8 text-lg">目標を入力すると、AI が旅のしおりを作ってくれます。</p>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          {/* 入力項目（ここは前と変わりません） */}
          <div className="mb-4">
            <label className="mb-2 block font-semibold">目標</label>
            <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3" />
          </div>
          <div className="mb-4">
            <label className="mb-2 block font-semibold">何日で達成したい？</label>
            <input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 p-3" />
          </div>
          <div className="mb-4">
            <label className="mb-2 block font-semibold">自分への一言</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3" rows={4} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !goal}
            className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "AIが記録を執筆中..." : "旅を始める"}
          </button>
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
      </div>
    </main>
  );
}