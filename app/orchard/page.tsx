"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import Link from "next/link";

type OrchardPost = {
  id: string;
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
};

export default function OrchardPage() {
  const [posts, setPosts] = useState<OrchardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

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
          <h1 className="text-3xl font-black text-orange-900 mb-1">🌳 みんなの広場</h1>
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
              <div key={post.id} className="bg-white rounded-[28px] p-6 shadow-sm border border-orange-100">

                {/* リンゴ + 目標名 */}
                <div className="flex items-start gap-4 mb-4">
                  {post.variety && (
                    <img src={`/images/apple-${post.variety}.svg`} className="w-14 h-14 object-contain drop-shadow-md shrink-0" />
                  )}
                  <div className="flex-1">
                    {post.goal && <h2 className="text-lg font-black text-slate-800">{post.goal}</h2>}
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      {post.createdAt ? new Date(post.createdAt).toLocaleDateString("ja-JP") : ""}
                      {post.stepTitle && ` ／ Day${post.stepDay}: ${post.stepTitle}`}
                    </p>
                  </div>
                </div>

                {/* コメント */}
                {post.comment && (
                  <div className="bg-amber-50 rounded-2xl p-3 mb-3 border border-amber-100">
                    <p className="text-sm text-slate-700 font-bold">💬 {post.comment}</p>
                  </div>
                )}

                {/* メモ */}
                {post.note && (
                  <div className="bg-stone-50 rounded-xl p-3 mb-3 border border-stone-100">
                    <p className="text-xs text-stone-500 font-bold leading-relaxed">{post.note}</p>
                  </div>
                )}

                {/* AI診断 */}
                {post.diagnosisText && (
                  <div className="bg-blue-50 rounded-2xl p-4 mb-3 border border-blue-100">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-2">AI達成診断</p>
                    <p className="text-sm text-slate-600 font-bold leading-relaxed line-clamp-4">{post.diagnosisText}</p>
                  </div>
                )}

                {/* やる気グラフ（簡易版） */}
                {post.chartData?.energies?.length > 0 && (
                  <div className="bg-stone-50 rounded-xl p-3 mb-3 border border-stone-100">
                    <p className="text-[9px] font-black text-stone-400 uppercase mb-2">やる気の記録</p>
                    <div className="flex items-end gap-1 h-10">
                      {post.chartData.energies.map((e: number, i: number) => {
                        const d = post.chartData.difficulties?.[i] || 3;
                        const face = d >= 4 ? "😵" : d <= 2 ? "😌" : "😐";
                        return (
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                            <span style={{fontSize:"8px"}}>{face}</span>
                            <div style={{width:"100%",height:`${e*4}px`,background:"#3b82f6",borderRadius:"2px 2px 0 0",opacity:0.7}} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 投稿種別バッジ */}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                    post.source === "completion"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {post.source === "completion" ? "✅ 目標達成" : "🍎 りんごシェア"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/history" className="text-sm font-bold text-orange-400 underline">
            ← 旅の記録へ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}