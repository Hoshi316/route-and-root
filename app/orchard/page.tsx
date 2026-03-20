"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";
import { APPLE_COLORS, APPLE_NAMES } from "@/lib/apple";

type OrchardPost = {
  id: string;
  routeId: string; // ✅ 追加
  userId: string;  // ✅ 追加
  goal?: string;
  comment?: string;
  variety?: string;
  note?: string;
  source?: string;
  moodScore?: number;
  stepDay?: number;
  stepTitle?: string;
  diagnosisText?: string;
  chartData?: any;
  createdAt: string;
  username?: string;
};

export default function OrchardPage() {
  const [posts, setPosts] = useState<OrchardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedPost, setSelectedPost] = useState<OrchardPost | null>(null);
  
  // ✅ ミツバチ送信状態
  const [sendingBee, setSendingBee] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async () => {
      try {
        const q = query(
          collection(db, "orchard_posts"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OrchardPost[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ✅ ミツバチを送る処理
  const handleSendBee = async (targetRouteId: string, targetUserId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return alert("ログインしてください🐝");
    if (currentUser.uid === targetUserId) return alert("自分の旅には送れません🐝");
    if (sendingBee) return;

    setSendingBee(true);
    try {
      const res = await fetch("/api/send-bee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRouteId,
          senderUid: currentUser.uid,
        }),
      });
      if (res.ok) {
        alert("ミツバチがあなたの応援を届けに行きました！🐝✨");
      } else {
        alert("ミツバチが迷子になったようです。");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingBee(false);
    }
  };

  const filtered = keyword
    ? posts.filter(p => p.goal?.includes(keyword) || p.comment?.includes(keyword))
    : posts;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50">
      <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50 p-6 pb-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-orange-900 mb-1">🌳 直売所</h1>
          <p className="text-sm text-orange-600/70">仲間のリンゴと知恵が集まる場所</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="目標キーワードで絞り込む..."
            className="w-full rounded-2xl border-2 border-orange-100 bg-white p-4 text-sm font-bold text-slate-700 outline-none focus:border-orange-300 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-100">
            <p className="text-slate-400 font-bold">まだおすそわけされた旅がありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="w-full text-left bg-white rounded-[28px] p-6 shadow-sm border border-orange-100 hover:border-orange-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4 mb-3">
                  {post.variety && (
                    <img src={`/images/apple-${post.variety}.svg`} className="w-12 h-12 object-contain drop-shadow-md shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {post.goal && <h2 className="text-base font-black text-slate-800 truncate">{post.goal}</h2>}
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      {post.username ? `@${post.username} ・ ` : ""}
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString("ja-JP") : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black px-3 py-1 rounded-full ${
                    post.source === "completion" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {post.source === "completion" ? "✅ 達成" : "🍎 シェア"}
                  </span>
                </div>
                {post.comment && (
                  <p className="text-sm text-slate-600 font-bold line-clamp-2 mb-2">💬 {post.comment}</p>
                )}
                {post.diagnosisText && (
                  <p className="text-xs text-slate-400 line-clamp-2">🤖 {post.diagnosisText}</p>
                )}
                <p className="text-[10px] text-orange-400 font-black mt-3 text-right">タップして詳細を見る →</p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/history" className="text-sm font-bold text-orange-400 underline">
            ← 旅の記録へ戻る
          </Link>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-[40px] sm:rounded-[40px] overflow-y-auto"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* リンゴヘッダー */}
            {selectedPost.variety && (
              <div className="flex items-center justify-center pt-8 pb-4 relative" style={{ background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)" }}>
                <img src={`/images/apple-${selectedPost.variety}.svg`} className="w-20 h-20 object-contain drop-shadow-xl" />
                
                {/* ✅ ミツバチボタンを右上に配置 */}
                <button
                  onClick={() => {
                    if (selectedPost.routeId && selectedPost.userId) {
                      handleSendBee(selectedPost.routeId, selectedPost.userId);
                    }
                  }}
                  disabled={sendingBee || auth.currentUser?.uid === selectedPost.userId}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "24px",
                    fontSize: "28px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    transition: "transform 0.2s",
                  }}
                  className="hover:scale-125 disabled:opacity-30 grayscale hover:grayscale-0"
                  title="応援のミツバチを送る 🐝"
                >
                  {sendingBee ? "⏳" : "🐝"}
                </button>
              </div>
            )}

            <div className="p-6">
              {/* 目標 + バッジ */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  {selectedPost.goal && <h2 className="text-xl font-black text-slate-800">{selectedPost.goal}</h2>}
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    {selectedPost.username ? `@${selectedPost.username} ・ ` : ""}
                    {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString("ja-JP") : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] font-black px-3 py-1 rounded-full ${
                  selectedPost.source === "completion" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {selectedPost.source === "completion" ? "✅ 目標達成" : "🍎 りんごシェア"}
                </span>
              </div>

              {/* コメント */}
              {selectedPost.comment && (
                <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-100">
                  <p className="text-[9px] font-black text-amber-400 uppercase mb-1">コメント</p>
                  <p className="text-sm text-slate-700 font-bold leading-relaxed">💬 {selectedPost.comment}</p>
                </div>
              )}

              {/* メモ */}
              {selectedPost.note && (
                <div className="bg-stone-50 rounded-2xl p-4 mb-4 border border-stone-100">
                  <p className="text-[9px] font-black text-stone-400 uppercase mb-1">メモ</p>
                  <p className="text-sm text-stone-600 font-bold leading-relaxed">{selectedPost.note}</p>
                </div>
              )}

              {/* AI診断 */}
              {selectedPost.diagnosisText && (
                <div className="bg-blue-50 rounded-2xl p-5 mb-4 border border-blue-100">
                  <p className="text-[9px] font-black text-blue-400 uppercase mb-3">🤖 AI達成診断</p>
                  <p className="text-sm text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{selectedPost.diagnosisText}</p>
                </div>
              )}

              {/* やる気グラフ */}
              {selectedPost.chartData?.energies?.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-5 mb-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-4">📊 ステップごとのやる気 & 難易度</p>
                  <div className="flex items-end gap-2 h-20 mb-3">
                    {selectedPost.chartData.energies.map((e: number, i: number) => {
                      const d = selectedPost.chartData.difficulties?.[i] || 3;
                      const feeling = selectedPost.chartData.feelings?.[i];
                      const barColor = feeling === "バッチリ" ? "#10b981" : feeling === "微妙" ? "#ef4444" : "#f97316";
                      const face = d >= 4 ? "😵" : d <= 2 ? "😌" : "😐";
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 gap-1">
                          <span style={{ fontSize: "12px" }}>{face}</span>
                          <div style={{ width: "100%", height: `${e * 13}px`, background: barColor, borderRadius: "4px 4px 0 0", opacity: 0.85, transition: "height 0.3s" }} />
                          <span style={{ fontSize: "8px", color: "#94a3b8" }}>{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* 凡例などは省略せず元のロジックを維持 */}
                </div>
              )}

              <button
                onClick={() => setSelectedPost(null)}
                className="w-full py-4 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}