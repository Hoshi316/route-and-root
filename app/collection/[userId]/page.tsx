"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserLogs, deleteUserLog } from "@/lib/firestore"; // deleteUserLogを追加
import { AppleVariety, APPLE_NAMES } from "@/lib/apple";

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

export default function CollectionPage() {
  const params = useParams();
  const userId = params?.userId as string; 
  const searchParams = useSearchParams();
  const fromRouteId = searchParams.get("from") || "test";

  const [apples, setApples] = useState<AppleLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ★ 整理（リセット）用のステート
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // ★ 目標ごとにリンゴをグループ化
  const groupedApples = useMemo(() => {
    return apples.reduce((acc, apple) => {
      const key = apple.routeName || "その他の目標";
      if (!acc[key]) acc[key] = [];
      acc[key].push(apple);
      return acc;
    }, {} as Record<string, AppleLog[]>);
  }, [apples]);

  // ★ リンゴを選んだり外したりする
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ★ 実際に消す処理
  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}個のリンゴを土に還しますか？`)) return;

    try {
      setLoading(true);
      await Promise.all(selectedIds.map(id => deleteUserLog(id)));
      
      setApples(prev => prev.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
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
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedIds([]);
            }}
            className="text-[10px] font-black bg-white px-3 py-1 rounded-full shadow-sm text-orange-600 border border-orange-100 hover:bg-orange-50"
          >
            {isSelectMode ? "キャンセル" : "整理する"}
          </button>
        </div>

        {isSelectMode ? (
          <button 
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            className="bg-red-500 text-white px-6 py-2 rounded-2xl font-black shadow-lg disabled:opacity-30 text-sm"
          >
            選択した{selectedIds.length}個をリセット
          </button>
        ) : (
          <div className="bg-white px-6 py-2 rounded-2xl shadow-sm border-2 border-orange-100">
            <span className="text-sm font-bold text-slate-400">合計</span>
            <span className="ml-2 text-2xl font-black text-orange-500">{apples.length}</span>
          </div>
        )}
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
        <div className="max-w-4xl mx-auto space-y-16">
          {Object.entries(groupedApples).map(([routeName, routeApples]) => (
            <section key={routeName} className="space-y-6">
              <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-2">
                <span className="text-2xl">📍</span>
                <h2 className="text-xl font-black text-orange-800">目標: {routeName}</h2>
                <span className="text-[10px] font-black bg-orange-200 text-orange-700 px-3 py-1 rounded-full">
                  {routeApples.length}個
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {routeApples.map((apple) => {
                  const isSelected = selectedIds.includes(apple.id);
                  return (
                    <div 
                      key={apple.id} 
                      onClick={() => isSelectMode && toggleSelect(apple.id)}
                      className={`bg-white p-6 rounded-[35px] shadow-xl border-2 transition-all group relative overflow-hidden
                        ${isSelectMode ? 'cursor-pointer' : ''}
                        ${isSelected ? 'border-red-400 bg-red-50 ring-4 ring-red-100' : 'border-orange-50 hover:scale-105'}
                      `}
                    >
                      {/* チェックボタン（モード中のみ） */}
                      {isSelectMode && (
                        <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-30
                          ${isSelected ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-200"}`}
                        >
                          {isSelected && "✓"}
                        </div>
                      )}

                      <div className="relative mb-4 flex justify-center items-center h-24">
                        <img 
                          src={`/images/apple-${apple.variety}.svg`} 
                          alt={apple.variety} 
                          className={`w-20 h-20 object-contain relative z-10 drop-shadow-lg transition-transform ${isSelected ? 'scale-90' : ''}`}
                        />
                      </div>
                      
                      <div className="text-center">
                        <span className="text-[9px] font-black text-orange-400 uppercase block mb-1">
                          {new Date(apple.createdAt).toLocaleDateString()}
                        </span>
                        <h3 className="font-black text-slate-700 text-sm mb-2">
                          {APPLE_NAMES[apple.variety] || "未知のリンゴ"}
                        </h3>
                        
                        <p className="text-[10px] text-slate-500 line-clamp-2 bg-orange-50/50 p-2 rounded-xl mb-2 min-h-[32px]">
                          {apple.note || "（メモなし）"}
                        </p>

                        {apple.comment && (
                          <div className="text-[9px] text-orange-400 font-bold italic border-t border-orange-100 pt-2">
                            「{apple.comment}」
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* フッター */}
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