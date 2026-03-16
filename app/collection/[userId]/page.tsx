"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserLogs } from "@/lib/firestore";

// 1. 型の定義（これをしっかり書くのが重要）
type AppleVariety = 'sun' | 'moon' | 'midnight' | 'forest' | 'rare';

type AppleLog = {
  id: string;
  variety: AppleVariety;
  note: string;
  moodScore: number;
  createdAt: string;
};

export default function CollectionPage() {
  const params = useParams();
  const userId = params?.userId as string; 
  
  const searchParams = useSearchParams();
  const fromRouteId = searchParams.get("from") || "test";

  // 2. Stateに型を付ける（any[] をやめる）
  const [apples, setApples] = useState<AppleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      console.log("🛠️ URLからIDを読み取り中...");
      return;
    }

    async function loadApples() {
      console.log("🚀 ID確定。データ取得開始:", userId);
      try {
        const data = await getUserLogs(userId);
        // 3. 取得したデータを AppleLog型として扱う
        setApples(data as AppleLog[]);
      } catch (error) {
        console.error("❌ 取得エラー:", error);
      } finally {
        setLoading(false);
      }
    }

    loadApples();
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !userId) {
        console.error("❌ URLの解析に失敗しました。フォルダ名が [userId] になっているか確認してください。");
        setLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading, userId]);

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
          <p className="text-orange-600/70 font-bold">これまでの旅の結晶</p>
         
          <p className="text-[10px] bg-red-500 text-white p-1 mt-2">
            検索用UID: {userId || "未取得"}
          </p>
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
      ) : apples.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-100">
          <p className="text-slate-400 font-bold">まだリンゴがありません。農園で育ててみましょう！</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-6">
          {apples.map((apple) => (
            <div key={apple.id} className="bg-white p-6 rounded-[35px] shadow-xl border-2 border-orange-50 hover:scale-105 transition-transform group">
              <div className="relative mb-4 flex justify-center items-center h-32">
                <div className="absolute inset-0 bg-orange-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
                <img 
                  src={`/images/apple-${apple.variety}.svg`} 
                  alt={apple.variety} 
                  className="w-24 h-24 object-contain relative z-10 drop-shadow-lg"
                />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-tighter block mb-1">
                  {new Date(apple.createdAt).toLocaleDateString()}
                </span>
                {/* 5. appleNames[apple.variety] の型エラーがこれで消えます */}
                <h3 className="font-black text-slate-700 text-sm mb-2">{appleNames[apple.variety] || "未知のリンゴ"}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-50 p-2 rounded-xl">
                  {apple.note || "（メモなし）"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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