"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserLogs } from "@/lib/firestore";

// 1. 型の定義を強化（routeId と comment も追加）
type AppleVariety = 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';

type AppleLog = {
  id: string;
  variety: AppleVariety;
  note: string;
  moodScore: number;
  createdAt: string;
  routeId: string; 
  routeName?: string;
  comment?: string; //  AIのメッセージも表示できるように追加
};

export default function CollectionPage() {
  const params = useParams();
  const userId = params?.userId as string; 
  const searchParams = useSearchParams();
  const fromRouteId = searchParams.get("from") || "test";

  const [apples, setApples] = useState<AppleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function loadApples() {
      try {
        const data = await getUserLogs(userId);
        setApples(data as AppleLog[]);
      } catch (error) {
        console.error("❌ 取得エラー:", error);
      } finally {
        setLoading(false);
      }
    }
    loadApples();
  }, [userId]);

  // ★ 目標ごとにリンゴをグループ化する計算（useMemoで効率化）
   const groupedApples = useMemo(() => {
  return apples.reduce((acc, apple) => {
    // 目標名があればそれを、なければIDを、それもなければ「不明」を表示
    const key = apple.routeName || apple.routeId || "その他の目標";
    if (!acc[key]) acc[key] = [];
    acc[key].push(apple);
    return acc;
  }, {} as Record<string, AppleLog[]>);
}, [apples]);

  const appleNames: Record<AppleVariety, string> = {
    sun: "サン・ルビー",
    moon: "ムーン・シルバー",
    forest: "フォレスト・ジェイド",
    midnight: "ミッドナイト",
    rare: "ゴールデン・ピピン"
  };

  return (
    <div className="min-h-screen bg-orange-50 p-6 pb-32">
      <header className="max-w-4xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-orange-900 mb-2">リンゴ貯蔵庫</h1>
          <p className="text-orange-600/70 font-bold">旅路ごとの結晶たち</p>
        </div>
        <div className="bg-white px-6 py-2 rounded-2xl shadow-sm border-2 border-orange-100">
          <span className="text-sm font-bold text-slate-400">合計</span>
          <span className="ml-2 text-2xl font-black text-orange-500">{apples.length}</span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : Object.keys(groupedApples).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-100">
          <p className="text-slate-400 font-bold">まだリンゴがありません。農園で育ててみましょう！</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-12">
          {/* ★ ルートごとにループを回す */}
          {Object.entries(groupedApples).map(([routeName, routeApples]) => (
            <section key={routeName} className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-2">
            <span className="text-2xl">📍</span>
            <h2 className="text-xl font-black text-orange-800">
            目標: {routeName} {/* ★ ここが綺麗になる！ */}
              </h2>
   
                <span className="text-xs font-bold bg-orange-200 text-orange-700 px-3 py-1 rounded-full">
                  {routeApples.length}個
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {routeApples.map((apple) => (
                  <div key={apple.id} className="bg-white p-6 rounded-[35px] shadow-xl border-2 border-orange-50 hover:scale-105 transition-transform group relative overflow-hidden">
                    {/* リンゴ表示 */}
                    <div className="relative mb-4 flex justify-center items-center h-24">
                      <img 
                        src={`/images/apple-${apple.variety}.svg`} 
                        alt={apple.variety} 
                        className="w-20 h-20 object-contain relative z-10 drop-shadow-lg"
                      />
                    </div>
                    
                    <div className="text-center">
                      <span className="text-[9px] font-black text-orange-400 uppercase block mb-1">
                        {new Date(apple.createdAt).toLocaleDateString()}
                      </span>
                      <h3 className="font-black text-slate-700 text-sm mb-2">{appleNames[apple.variety] || "未知のリンゴ"}</h3>
                      
                      {/* メモの表示 */}
                      <p className="text-[10px] text-slate-500 line-clamp-2 bg-orange-50/50 p-2 rounded-xl mb-2">
                        {apple.note || "（メモなし）"}
                      </p>

                      {/* ★ Geminiのメッセージがあれば表示 */}
                      {apple.comment && (
                        <div className="text-[9px] text-orange-400 font-bold italic border-t border-orange-100 pt-2">
                          「{apple.comment}」
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* フッターはそのまま */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/50 flex justify-around items-center z-40">
        <Link href={`/garden/${fromRouteId}`} className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">🌳</span>
          <span className="text-[10px] font-black text-slate-400">農園</span>
        </Link>
        <Link href={`/map/${fromRouteId}`} className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">🗺️</span>
          <span className="text-[10px] font-black text-slate-400">マップ</span>
        </Link>
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 cursor-default">
          <span className="text-2xl text-white">📦</span>
        </div>
      </footer>
    </div>
  );
}