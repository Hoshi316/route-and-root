"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";

type PublicRoute = {
  id: string;
  goal: string;
  finalDiagnosis: string;
  displayName: string;
  sharedAt: string;
  userId: string;
};

export default function OrchardPage() {
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGoal, setMyGoal] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        const q = query(
          collection(db, "routes"),
          where("isPublic", "==", true),
          where("progress", "==", 100),
          orderBy("sharedAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PublicRoute[];
        setRoutes(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 自分と似た目標を上に表示するソート
  const sortedRoutes = myGoal
    ? [...routes].sort((a, b) => {
        const aMatch = a.goal.includes(myGoal) || myGoal.includes(a.goal) ? 1 : 0;
        const bMatch = b.goal.includes(myGoal) || myGoal.includes(b.goal) ? 1 : 0;
        return bMatch - aMatch;
      })
    : routes;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 p-6 pb-24">
      <div className="mx-auto max-w-2xl">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-orange-900 mb-1">🌳 みんなの広場</h1>
          <p className="text-sm text-orange-600/70">旅を完遂した仲間のリンゴと知恵が集まる場所</p>
        </div>

        {/* 自分の目標で絞り込み */}
        <div className="mb-6">
          <input
            type="text"
            value={myGoal}
            onChange={(e) => setMyGoal(e.target.value)}
            placeholder="目標キーワードで絞り込む..."
            className="w-full rounded-2xl border-2 border-orange-100 bg-white p-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 transition-all"
          />
        </div>

        {/* 投稿一覧 */}
        {sortedRoutes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-100">
            <p className="text-slate-400 font-bold">まだおすそわけされた旅がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRoutes.map((route) => (
              <div key={route.id} className="bg-white rounded-[28px] p-6 shadow-sm border border-orange-100">

                {/* 目標名 + ユーザー名 */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Goal</span>
                    <h2 className="text-lg font-black text-slate-800 mt-0.5">{route.goal}</h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-slate-400">{route.displayName || "旅人"}</p>
                    <p className="text-[10px] text-slate-300">
                      {route.sharedAt ? new Date(route.sharedAt).toLocaleDateString("ja-JP") : ""}
                    </p>
                  </div>
                </div>

                {/* 達成診断 */}
                {route.finalDiagnosis && (
                  <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-100">
                    <p className="text-[9px] font-black text-amber-400 uppercase mb-2">AI達成診断</p>
                    <p className="text-sm text-slate-600 font-bold leading-relaxed line-clamp-4">
                      {route.finalDiagnosis}
                    </p>
                  </div>
                )}

                {/* 完了バッジ */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                    ✅ 達成済み
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {route.sharedAt ? new Date(route.sharedAt).toLocaleString("ja-JP") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 戻るボタン */}
        <div className="mt-8 text-center">
          <Link href="/history" className="text-sm font-bold text-orange-400 underline">
            ← 旅の記録へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}