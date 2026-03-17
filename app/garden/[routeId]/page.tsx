"use client";

import { useState, use, useEffect } from "react"; 
import { auth } from "@/lib/firebase"; 
import { onAuthStateChanged, User } from "firebase/auth";
import AppleTree from "@/components/AppleTree";
import HarvestModal from "@/components/HarvestModal";
import Link from "next/link";
// ★ lib/apple から共通定義を呼び出す
import { AppleVariety, APPLE_NAMES, APPLE_COLORS } from "@/lib/apple"; 

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
  const [routeName, setRouteName] = useState("");
  const [variety, setVariety] = useState<AppleVariety>('forest');
  
  const pendingCount = pendingApples.length;

  // 2. ログイン & ルート情報取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    async function fetchRoute() {
      try {
        const res = await fetch(`/api/get-route?routeId=${routeId}`);
        const data = await res.json();
        setRouteName(data.goal);
        
        // ★ データベースに保存されていた値を復元する
        if (data.nutrition !== undefined) setNutrition(data.nutrition);
        if (data.pendingApples) setPendingApples(data.pendingApples);
        if (data.variety) setVariety(data.variety);
      } catch (e) {
        console.error("ルート取得失敗:", e);
      }
    }

    fetchRoute();
    return () => unsubscribe();
  }, [routeId]);
  
  
  const saveProgress = async (newNutrition: number, newApples: any[], currentVariety: string) => {
    try {
      await fetch("/api/update-route-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId,
          nutrition: newNutrition,
          pendingApples: newApples,
          variety: currentVariety
        }),
      });
    } catch (e) {
      console.error("自動保存失敗:", e);
    }
  };
  const isFull = nutrition >= 100;
  let treeLevel = isAdult ? 2 : (nutrition < 30 ? 0 : nutrition < 60 ? 1 : 2);

  // 3. 養分を注ぐ（Gemini連携）
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
        body: JSON.stringify({ moodScore: useMood ? mood : null, note: memo.trim() || null }),
      });
      const data = await response.json();

      const nextNutrition = Math.min(nutrition + 25, 100);
      const nextApples = [...pendingApples, {
        variety: data.variety,
        note: memo.trim() || "（メモなし）",
        moodScore: useMood ? mood : null,
        comment: data.message,
        createdAt: new Date().toISOString()
      }];
      
      setVariety(data.variety);
      setPendingApples(nextApples);
      setNutrition(nextNutrition);
      setAiMessage(data.message);
      setMemo("");
      saveProgress(nextNutrition, nextApples, data.variety);

    } catch (error) {
      console.error("AI連携失敗:", error);
    } finally {
      setIsWatering(false);
    }
  };

  // 4. 収穫
  const handleHarvest = async () => {
    if (!user || pendingCount === 0) return;

    setIsSaving(true);
    try {
      await Promise.all(pendingApples.map(apple => 
        fetch("/api/save-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            routeId: routeId,
            routeName: routeName || "無題の旅路",
            ...apple
          }),
        })
      ));

      setShowModal(true);
      setPendingApples([]);
      setNutrition(0);
      saveProgress(0, [], 'forest'); 

    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNutrition(0); 
    setAiMessage("");
    setIsAdult(false);
  };

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
        <h1 className="text-3xl font-black text-orange-900">
          🍎 {routeName || "Route & Root"} 農園
        </h1>
        <p className="text-orange-600/80 font-bold">
          {user ? `${user.displayName} さんの旅路` : "ゲストの農園"}
        </p>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
        
        {/* 左側：入力エリア */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-orange-100">
          <h2 className="text-xl font-black text-slate-700 mb-6 flex justify-between items-center">
            <span>📝 今日の養分</span>
            {pendingCount > 0 && (
              <span className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full animate-pulse">
                実り待機中: {pendingCount}個
              </span>
            )}
          </h2>
          
          <div className="space-y-6">
            <div className="bg-orange-50/50 p-4 rounded-2xl border-2 border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useMood} 
                    onChange={(e) => setUseMood(e.target.checked)}
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="font-bold text-slate-700 text-sm">やる気を伝える</span>
                </label>
                {useMood && <span className="text-orange-500 font-black px-2 py-1 bg-white rounded-lg shadow-sm text-xs">Lv.{mood}</span>}
              </div>
              <input 
                type="range" min="1" max="5" value={mood} 
                disabled={!useMood} 
                onChange={(e) => setMood(Number(e.target.value))} 
                className={`w-full ${useMood ? 'accent-orange-500' : 'opacity-30 cursor-not-allowed'}`} 
              />
            </div>

            <textarea 
              className="w-full p-4 bg-white border-2 border-orange-200 text-slate-900 font-bold rounded-2xl h-32 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all placeholder:text-slate-400 text-sm"
              placeholder="今の気持ちをメモ..." 
              value={memo} 
              onChange={(e) => setMemo(e.target.value)} 
            />

            {isFull ? (
              <button onClick={handleHarvest} disabled={isSaving} className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black rounded-3xl shadow-lg animate-bounce disabled:opacity-50">
                {isSaving ? "保存中..." : `🍎 ${pendingCount}個のリンゴを収穫する！`}
              </button>
            ) : (
              <button 
                onClick={handleGiveNutrition} 
                disabled={isWatering} 
                className="w-full py-5 text-white font-black rounded-3xl shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: APPLE_COLORS[variety] }} // 品種に合わせて色変更
              >
                {isWatering ? "吸収中..." : `${APPLE_NAMES[variety]}を注ぐ 💧`}
              </button>
            )}
          </div>
        </div>

        {/* 右側：木が表示されるエリア */}
        <div className="relative overflow-hidden flex flex-col items-center justify-center bg-white p-8 rounded-[40px] shadow-xl border-4 border-emerald-100 min-h-[480px]">
          
          {/* 💧 降り注ぐ演出（色を品種に連動） */}
          {isWatering && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {[...Array(8)].map((_, i) => (
                <span 
                  key={i} 
                  className="absolute text-2xl animate-drop"
                  style={{ 
                    left: `${10 + i * 12}%`, 
                    color: APPLE_COLORS[variety], 
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
            hasApple={pendingCount > 0} 
            moodScore={useMood ? mood : 3} 
          />

          <div className="mt-8 w-full max-w-xs text-center">
            <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: APPLE_COLORS[variety] }}>
              <span>Growth</span>
              <span>{nutrition}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-emerald-50">
              <div 
                className="h-full transition-all duration-1000" 
                style={{ width: `${nutrition}%`, backgroundColor: APPLE_COLORS[variety] }} 
              />
            </div>
          </div>

          {aiMessage && (
            <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl shadow-sm relative animate-in fade-in zoom-in duration-300 mx-4">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-50 border-t-2 border-l-2 border-orange-200 rotate-45"></div>
              <p className="text-[9px] font-black text-orange-400 uppercase mb-1 text-center">園主の言葉</p>
              <p className="text-sm text-slate-700 font-bold italic text-center leading-relaxed">「{aiMessage}」</p>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/50 flex justify-around items-center z-40">
        <Link href={`/map/${routeId}`} className="flex flex-col items-center gap-1 hover:opacity-70">
          <span className="text-2xl">🗺️</span>
          <span className="text-[10px] font-black text-slate-400">マップ</span>
        </Link>
        <Link href={`/collection/${user?.uid || 'guest'}?from=${routeId}`} className="flex flex-col items-center gap-1 hover:opacity-70">
          <span className="text-2xl">📦</span>
          <span className="text-[10px] font-black text-slate-400">貯蔵庫</span>
        </Link>
        <Link href="/history" className="flex flex-col items-center gap-1 hover:opacity-70">
          <span className="text-2xl">📜</span>
          <span className="text-[10px] font-black text-slate-400">履歴</span>
        </Link>
      </footer>

    {showModal && (
    <HarvestModal 
      apples={pendingApples} // variety ではなくリストを渡す
      onClose={handleCloseModal} 
      />)}
    </div>
  );
}