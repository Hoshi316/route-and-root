"use client"; // 必ず1行目に書く

import { useState, use, useEffect } from "react"; 
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, User } from "firebase/auth";
import AppleTree from "@/components/AppleTree";
import HarvestModal from "@/components/HarvestModal";
import Link from "next/link";

export default function GardenPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);

  // 1. 状態管理
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutrition, setNutrition] = useState(0);
  const [isAdult, setIsAdult] = useState(false); 
  const [useMood, setUseMood] = useState(false); 
  const [mood, setMood] = useState(3);
  const [memo, setMemo] = useState("");
  const [isWatering, setIsWatering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [pendingApples, setPendingApples] = useState<any[]>([]);
  const [variety, setVariety] = useState<'sun' | 'moon' | 'midnight' | 'forest' | 'rare'>('forest');
  
  // ログイン監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isFull = nutrition >= 100;
  let treeLevel = isAdult ? 2 : (nutrition < 30 ? 0 : nutrition < 60 ? 1 : 2);

  // 養分を注ぐ（Gemini連携）
  const handleGiveNutrition = async () => {
    const hasInput = useMood || (memo.trim().length > 0);
    if (!hasInput) {
      alert("やる気をONにするか、メモを入力してください🌱");
      return;
    }

    setIsWatering(true);
    try {
      const response = await fetch("/api/generate-apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          moodScore: useMood ? mood : null, 
          note: memo.trim() || null 
        }),
      });

      const data = await response.json();

      const newApple = {
      variety: data.variety,
      note: memo.trim() || "（メモなし）",
      moodScore: useMood ? mood : null,
      comment: data.message,
      createdAt: new Date().toISOString()
      };
      
      setVariety(data.variety);
      setPendingApples(prev => [...prev, newApple]);
      setNutrition(prev => Math.min(prev + 25, 100));
      setAiMessage(data.message);
      setMemo(""); 

    
    } catch (error) {
      console.error("AI連携失敗:", error);
    } finally {
      setIsWatering(false);
    }
  };

  // 収穫
const handleHarvest = async () => {
  if (!user || pendingApples.length === 0) return;

  setIsSaving(true);
  try {
    // ★ 全てのリンゴをループで保存（Promise.allを使うと速いです）
    await Promise.all(pendingApples.map(apple => 
      fetch("/api/save-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          routeId: routeId,
          ...apple // 溜めておいたリンゴの情報（variety, note, commentなど）
        }),
      })
    ));

    setShowModal(true);
    setPendingApples([]); // 収穫したので空にする
  } catch (error) {
    console.error(error);
    alert("保存中にエラーが発生しました");
  } finally {
    setIsSaving(false);
  }
};

  const handleCloseModal = () => {
    setShowModal(false);
    setNutrition(0); 
    setMemo("");
    setAiMessage("");
    setIsAdult(false);
  };

  // アニメーション用のCSSを「コンポーネント」として定義（エラー回避のため）
  const AnimationStyles = () => (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes drop {
        0% { transform: translateY(0); opacity: 0; }
        30% { opacity: 1; }
        100% { transform: translateY(350px); opacity: 0; }
      }
      .animate-drop {
        display: inline-block;
        animation: drop linear infinite;
      }
    `}} />
  );

  if (loading) return <div className="p-10 text-center font-bold">農園を準備中...</div>;

  return (
    <div className="min-h-screen bg-orange-50 p-6 pb-32 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black text-orange-900">🍎 Route & Root 農園</h1>
        <p className="text-orange-600/80 font-bold">
          {user ? `${user.displayName} さんの農園` : "ゲストの農園"}
        </p>
        <p className="text-xs text-orange-400 mt-1 uppercase tracking-widest">Route: {routeId}</p>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
        
        {/* 左側：入力エリア */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-orange-100">
          <h2 className="text-xl font-black text-slate-700 mb-6">📝 今日の養分</h2>
          <div className="space-y-6">
            
            {/* やる気スライダー */}
            <div className="bg-orange-50/50 p-4 rounded-2xl border-2 border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useMood} 
                    onChange={(e) => setUseMood(e.target.checked)}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="font-bold text-slate-700">今日のやる気を伝える</span>
                </label>
                {useMood && <span className="text-orange-500 font-black px-2 py-1 bg-white rounded-lg shadow-sm text-sm">Lv.{mood}</span>}
              </div>
              <input 
                type="range" min="1" max="5" value={mood} 
                disabled={!useMood} 
                onChange={(e) => setMood(Number(e.target.value))} 
                className={`w-full ${useMood ? 'accent-orange-500' : 'opacity-30 cursor-not-allowed'}`} 
              />
            </div>

            <textarea 
              className="w-full p-4 bg-white border-2 border-orange-200 text-slate-900 font-bold rounded-2xl h-32 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all placeholder:text-slate-400"
              placeholder="今の気持ちをメモ..." 
              value={memo} 
              onChange={(e) => setMemo(e.target.value)} 
            />

            {isFull ? (
              <button onClick={handleHarvest} disabled={isSaving} className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black rounded-3xl shadow-lg animate-bounce disabled:opacity-50">
                {isSaving ? "保存中..." : "🍎 リンゴを収穫する！"}
              </button>
            ) : (
              <button onClick={handleGiveNutrition} disabled={isWatering} className="w-full py-5 bg-orange-500 text-white font-black rounded-3xl shadow-lg hover:bg-orange-600 transition-all">
                {isWatering ? "養分を吸収中..." : "養分を注ぐ 💧"}
              </button>
            )}
          </div>
        </div>

        {/* 右側：木が表示されるエリア */}
        <div className="relative overflow-hidden flex flex-col items-center justify-center bg-white p-8 rounded-[40px] shadow-xl border-4 border-emerald-100 min-h-[480px]">
          
          {/* 💧 降り注ぐ演出 */}
          {isWatering && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {[...Array(8)].map((_, i) => (
                <span 
                  key={i} 
                  className="absolute text-2xl animate-drop"
                  style={{ 
                    left: `${10 + i * 12}%`, 
                    top: '-20px', 
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s'
                  }}
                >
                  💧
                </span>
              ))}
            </div>
          )}

          <AppleTree 
            level={treeLevel} 
            variety={variety === 'rare' ? 'sun' : variety} 
            hasApple={isFull} 
            moodScore={useMood ? mood : 3} 
          />

          <div className="mt-8 w-full max-w-xs text-center">
            <div className="flex justify-between text-xs font-black text-emerald-700 mb-2 uppercase tracking-widest">
              <span>Growth</span>
              <span>{nutrition}%</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border-2 border-emerald-50">
              <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${nutrition}%` }} />
            </div>
          </div>

          {aiMessage && (
            <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl shadow-sm relative animate-in fade-in zoom-in duration-300">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-50 border-t-2 border-l-2 border-orange-200 rotate-45"></div>
              <p className="text-[10px] font-black text-orange-400 uppercase mb-1 text-center">園主の言葉</p>
              <p className="text-sm text-slate-700 font-bold italic text-center">「{aiMessage}」</p>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/50 flex justify-around items-center z-40">
        <Link href={`/map/${routeId}`} className="flex flex-col items-center gap-1">
          <span className="text-2xl">🗺️</span>
          <span className="text-[10px] font-black text-slate-400">マップ</span>
        </Link>
        <Link href={`/collection/${user?.uid || 'guest'}?from=${routeId}`} className="flex flex-col items-center gap-1">
          <span className="text-2xl">📦</span>
          <span className="text-[10px] font-black text-slate-400">貯蔵庫</span>
        </Link>
      </footer>

      {showModal && <HarvestModal variety={variety} onClose={handleCloseModal} />}
      
      {/* ★ 修正したAnimationStylesをタグとして呼び出し */}
      <AnimationStyles />
    </div>
  );
}