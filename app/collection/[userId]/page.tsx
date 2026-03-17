"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserLogs, deleteUserLog } from "@/lib/firestore";
import { AppleVariety, APPLE_NAMES, APPLE_COLORS } from "@/lib/apple";

type AppleLog = {
  id: string;
  variety: AppleVariety;
  note: string;
  moodScore: number;
  createdAt: string;
  routeId: string; 
  routeName?: string;
  comment?: string;
};

// まとめた後のデータ型
type AppleGroup = {
  variety: AppleVariety;
  count: number;
  color: string;
  ids: string[]; // 削除用にIDを溜めておく
  memos: {
    id: string;
    text: string;
    comment?: string;
    date: string;
  }[];
};

export default function CollectionPage() {
  const params = useParams();
  const userId = params?.userId as string; 
  const searchParams = useSearchParams();
  const fromRouteId = searchParams.get("from") || "test";

  const [apples, setApples] = useState<AppleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVarietyKeys, setSelectedVarietyKeys] = useState<string[]>([]); // "目標名-品種" で選択管理

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

  // ★ 目標 ＞ 品種 ごとにがっちゃんこするロジック
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, AppleGroup>> = {};

    apples.forEach((apple) => {
      const rName = apple.routeName || "その他の目標";
      const v = apple.variety;

      if (!groups[rName]) groups[rName] = {};

      if (!groups[rName][v]) {
        groups[rName][v] = {
          variety: v,
          count: 0,
          color: APPLE_COLORS[v] || "#10b981",
          ids: [],
          memos: []
        };
      }

      groups[rName][v].count += 1;
      groups[rName][v].ids.push(apple.id);
      groups[rName][v].memos.push({
        id: apple.id,
        text: apple.note || "（メモなし）",
        comment: apple.comment,
        date: new Date(apple.createdAt).toLocaleDateString()
      });
    });

    return groups;
  }, [apples]);

  const toggleSelect = (routeName: string, variety: string) => {
    const key = `${routeName}-${variety}`;
    setSelectedVarietyKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleDelete = async () => {
    const allSelectedIds = selectedVarietyKeys.flatMap(key => {
      const [rName, v] = key.split("-");
      return groupedData[rName][v].ids;
    });

    if (allSelectedIds.length === 0) return;
    if (!confirm(`${allSelectedIds.length}個のリンゴを土に還しますか？`)) return;

    try {
      setLoading(true);
      await Promise.all(allSelectedIds.map(id => deleteUserLog(id)));
      setApples(prev => prev.filter(a => !allSelectedIds.includes(a.id)));
      setSelectedVarietyKeys([]);
      setIsSelectMode(false);
    } catch (e) {
      alert("削除に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 p-6 pb-32">
      <header className="max-w-4xl mx-auto mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-orange-900 mb-2">リンゴ貯蔵庫</h1>
          <button 
            onClick={() => { setIsSelectMode(!isSelectMode); setSelectedVarietyKeys([]); }}
            className="text-[10px] font-black bg-white px-3 py-1 rounded-full shadow-sm text-orange-600 border border-orange-100 hover:bg-orange-50"
          >
            {isSelectMode ? "キャンセル" : "整理する"}
          </button>
        </div>
        <div className="bg-white px-6 py-2 rounded-2xl shadow-sm border-2 border-orange-100">
          <span className="text-sm font-bold text-slate-400">Total</span>
          <span className="ml-2 text-2xl font-black text-orange-500">{apples.length}</span>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-100">
          <p className="text-slate-400 font-bold">まだリンゴがありません。農園で育ててみましょう！</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-16">
          {Object.entries(groupedData).map(([routeName, varieties]) => (
            <section key={routeName} className="space-y-6">
              <h2 className="text-xl font-black text-orange-800 border-l-4 border-orange-500 pl-4">📍 目標: {routeName}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(varieties).map(([v, data]) => {
                  const isSelected = selectedVarietyKeys.includes(`${routeName}-${v}`);
                  return (
                    <div 
                      key={v}
                      onClick={() => isSelectMode && toggleSelect(routeName, v)}
                      className={`bg-white rounded-[35px] p-6 shadow-xl border-2 transition-all relative overflow-hidden flex flex-col
                        ${isSelectMode ? 'cursor-pointer' : ''}
                        ${isSelected ? 'border-red-400 bg-red-50 ring-4 ring-red-100' : 'border-orange-50'}
                      `}
                    >
                      {/* リンゴ情報ヘッダー */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <img src={`/images/apple-${data.variety}.svg`} className="w-16 h-16 object-contain drop-shadow-md" />
                          <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                            x{data.count}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-700">{APPLE_NAMES[data.variety] || v}</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: data.color }}>Collection</p>
                        </div>
                        {isSelectMode && (
                          <div className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-red-500 border-red-500 text-white" : "border-slate-200"}`}>
                            {isSelected && "✓"}
                          </div>
                        )}
                      </div>

                      {/* 溜まったメモのリスト */}
                      <div className="bg-orange-50/50 rounded-2xl p-4 space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                        <p className="text-[9px] font-black text-orange-300 uppercase">Growth History</p>
                        {data.memos.map((memo) => (
                          <div key={memo.id} className="border-l-2 border-orange-200 pl-3 py-1">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs text-slate-700 font-bold leading-tight">{memo.text}</p>
                              <span className="text-[8px] text-slate-400 shrink-0 ml-2">{memo.date}</span>
                            </div>
                            {memo.comment && (
                              <p className="text-[10px] text-orange-400 font-bold italic leading-tight">「{memo.comment}」</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 削除実行ボタン */}
      {isSelectMode && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <button onClick={handleDelete} disabled={selectedVarietyKeys.length === 0} className="bg-red-500 text-white px-8 py-4 rounded-full font-black shadow-2xl disabled:opacity-50 active:scale-95 transition-all">
            選択した品種をまとめて土に還す 🔥
          </button>
        </div>
      )}

      {/* ナビゲーション */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/50 flex justify-around items-center z-40">
        <Link href={`/garden/${fromRouteId}`} className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">🌳</span><span className="text-[10px] font-black text-slate-400">農園</span>
        </Link>
        <Link href={`/map/${fromRouteId}`} className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">🗺️</span><span className="text-[10px] font-black text-slate-400">マップ</span>
        </Link>
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"><span className="text-2xl text-white">📦</span></div>
        <Link href="/history" className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">📜</span><span className="text-[10px] font-black text-slate-400">履歴</span>
        </Link>
      </footer>
    </div>
  );
}