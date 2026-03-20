"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserRoutes } from "@/lib/firestore";
import { RouteDoc } from "@/types/route";
import Link from "next/link";

type RouteWithId = RouteDoc & { id: string };

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<RouteWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [menuOpen, setMenuOpen] = useState(false); // ← ここに移動

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const data = await getUserRoutes(currentUser.uid);
          setRoutes(data);
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredRoutes = routes.filter((r) =>
    tab === "active" ? r.progress < 100 : r.progress === 100
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <p className="font-bold text-gray-500">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6 pb-24">
      <div className="mx-auto max-w-2xl">

        {/* ヘッダー */}
        <div className="mb-6 flex items-end justify-between relative">
          <div>
            <h1 className="text-3xl font-black text-orange-900">📜 旅の記録</h1>
            <p className="mt-1 text-sm text-orange-600/70">これまでの目標一覧</p>
          </div>

          {/* ハンバーガーボタン */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex flex-col gap-1.5 p-3 rounded-xl bg-white shadow hover:bg-gray-50 transition"
            >
              <span className={`block h-0.5 w-5 bg-gray-600 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-5 bg-gray-600 transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-gray-600 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-20 w-44 bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-orange-50 transition"
                  >
                    <span>✦</span>
                    <span>新しい旅へ</span>
                  </Link>
                  <div className="h-px bg-orange-50" />
                  <Link
                    href="/orchard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-orange-50 transition"
                  >
                    <span>🌳</span>
                    <span>直売所</span>
                  </Link>
                  <div className="h-px bg-orange-50" />
                  <button
                    onClick={async () => {
  setMenuOpen(false);
  const { logout } = await import("@/lib/auth");
  await logout();
  window.location.href = "/";
}}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition"
                  >
                    <span>↩</span>
                    <span>ログアウト</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("active")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              tab === "active"
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            🚶 進行中
            {routes.filter(r => r.progress < 100).length > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                tab === "active" ? "bg-white/30 text-white" : "bg-orange-100 text-orange-600"
              }`}>
                {routes.filter(r => r.progress < 100).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("done")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              tab === "done"
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            ✅ 完了
            {routes.filter(r => r.progress === 100).length > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                tab === "done" ? "bg-white/30 text-white" : "bg-emerald-100 text-emerald-600"
              }`}>
                {routes.filter(r => r.progress === 100).length}
              </span>
            )}
          </button>
        </div>

        {/* タブ */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("active")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              tab === "active"
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            🚶 進行中
            {routes.filter(r => r.progress < 100).length > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                tab === "active" ? "bg-white/30 text-white" : "bg-orange-100 text-orange-600"
              }`}>
                {routes.filter(r => r.progress < 100).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("done")}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${
              tab === "done"
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            ✅ 完了
            {routes.filter(r => r.progress === 100).length > 0 && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                tab === "done" ? "bg-white/30 text-white" : "bg-emerald-100 text-emerald-600"
              }`}>
                {routes.filter(r => r.progress === 100).length}
              </span>
            )}
          </button>
        </div>

        {/* ルート一覧 */}
        {filteredRoutes.length === 0 ? (
          <div className="rounded-3xl border-4 border-dashed border-orange-100 bg-white py-16 text-center">
            <p className="text-slate-400">
              {tab === "active" ? "進行中の旅はありません。" : "完了した旅はまだありません。"}
            </p>
            {tab === "active" && (
              <Link href="/" className="mt-4 inline-block font-bold text-orange-500 underline">
                新しい旅を始める
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoutes.map((route) => {
              const completedCount = route.steps.filter((s) => s.done).length;
              const totalCount = route.steps.length;
              const progressPercent =
                totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
              const isCompleted = progressPercent === 100;
              const createdDate = new Date(route.createdAt).toLocaleDateString("ja-JP");

              return (
                <div
                  key={route.id}
                  className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition hover:shadow-md ${
                    isCompleted ? "border-emerald-200" : "border-orange-100"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h2 className="text-lg font-black text-slate-800">{route.goal}</h2>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {isCompleted ? "✅ 完了" : "🚶 進行中"}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-gray-400">
                      <span>{completedCount}/{totalCount} ステップ完了</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${isCompleted ? "bg-emerald-400" : "bg-orange-400"}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mb-4 text-xs text-gray-400">
                    📅 {createdDate}　／　{route.durationDays}日間プラン
                  </p>

                  <div className="flex gap-2">
                    <Link href={`/map/${route.id}`} className="flex-1 rounded-xl bg-orange-500 py-2 text-center text-sm font-bold text-white transition hover:bg-orange-600">
                      🗺️ マップを見る
                    </Link>
                    <Link href={`/garden/${route.id}`} className="flex-1 rounded-xl bg-emerald-500 py-2 text-center text-sm font-bold text-white transition hover:bg-emerald-600">
                      🍎 農園へ
                    </Link>
                    <Link href={`/collection/${route.id}`} className="flex-1 rounded-xl bg-slate-200 py-2 text-center text-sm font-bold text-slate-600 transition hover:bg-slate-300">
                      📦 リンゴ
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}