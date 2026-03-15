"use client";
import { useState, use } from "react"; 
import AppleTree from "@/components/AppleTree";
import HarvestModal from "@/components/HarvestModal";
import Link from "next/link";

export default function GardenPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);

  // 状態管理
  const [nutrition, setNutrition] = useState(0);
  const [isAdult, setIsAdult] = useState(false); 
  const [mood, setMood] = useState(3);
  const [memo, setMemo] = useState("");
  const [variety, setVariety] = useState<'sun' | 'moon' | 'midnight' | 'forest' | 'rare'>('forest');
  const [isWatering, setIsWatering] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // ★ 保存中かどうかを管理

  const isFull = nutrition >= 100;
  let treeLevel = isAdult ? 2 : (nutrition < 30 ? 0 : nutrition < 60 ? 1 : 2);

  const handleGiveNutrition = () => {
    setIsWatering(true);
    setTimeout(() => {
      const boost = mood * 5 + (memo.length > 0 ? 10 : 0);
      const newNutrition = Math.min(nutrition + boost, 100);
      setNutrition(newNutrition);

      if (newNutrition >= 60) setIsAdult(true);

      // 品種判定（小川さんのこだわりロジック）
      if (Math.random() < 0.1) {
        setVariety('rare');
      } else {
        if (mood >= 4) setVariety('sun');
        else if (mood <= 2) setVariety('midnight');
        else setVariety('forest');
      }
      setIsWatering(false);
    }, 1000);
  };

  // ★ 収穫関数を星さんのAPIとガッチャンコ！
  const handleHarvest = async () => {
    setIsSaving(true);

    try {
      // 星さんの /api/save-log にデータを送る
      const response = await fetch("/api/save-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-1", // とりあえず固定
          routeId: routeId,
          moodScore: mood,
          note: memo,
          // 星さん側のAPIにも「品種」を伝えておくと後で便利です
          variety: variety 
        }),
      });

      if (!response.ok) throw new Error("保存に失敗しました");

      // 保存に成功したら、小川さん自慢のポップアップを出す！
      setShowModal(true);
    } catch (error) {
      console.error(error);
      alert("クラウドへの保存に失敗しました。でもLocalStorageには残しますね！");
      
      // バックアップとして今まで通りLocalStorageにも保存
      const newApple = { id: Date.now(), variety, memo, date: new Date().toLocaleDateString() };
      const savedApples = JSON.parse(localStorage.getItem("apple-collection") || "[]");
      localStorage.setItem("apple-collection", JSON.stringify([...savedApples, newApple]));
      setShowModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNutrition(0); 
    setMemo("");
  };

  return (
    <div className="min-h-screen bg-orange-50 p-6 pb-32 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black text-orange-900">🍎 Route & Root 農園</h1>
        <p className="text-orange-600/80 font-bold text-sm">ROUTE ID: {routeId}</p>
      </header>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
        {/* 左側：入力エリア */}
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-orange-100">
          <h2 className="text-xl font-black text-slate-700 mb-6 flex items-center gap-2">📝 今日の養分</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2">やる気レベル：{mood}</label>
              <input type="range" min="1" max="5" value={mood} onChange={(e) => setMood(Number(e.target.value))} className="w-full accent-orange-500" />
            </div>
            <textarea className="w-full p-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl h-32 outline-none focus:border-orange-300 transition-colors" placeholder="今の気持ちをメモして養分にしよう..." value={memo} onChange={(e) => setMemo(e.target.value)} />
            
            {isFull ? (
              <button 
                onClick={handleHarvest} 
                disabled={isSaving}
                className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black rounded-3xl shadow-lg animate-bounce text-lg disabled:opacity-50"
              >
                {isSaving ? "クラウドにセーブ中..." : "🍎 リンゴを収穫する！"}
              </button>
            ) : (
              <button onClick={handleGiveNutrition} disabled={isWatering} className="w-full py-5 bg-orange-500 text-white font-black rounded-3xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all">
                {isWatering ? "養分吸収中..." : "養分を注ぐ 💧"}
              </button>
            )}
          </div>
        </div>

        {/* 右側：表示エリア */}
        <div className="flex flex-col items-center justify-center bg-white p-8 rounded-[40px] shadow-xl border-4 border-emerald-100 min-h-[480px]">
          <AppleTree level={treeLevel} variety={variety === 'rare' ? 'sun' : variety} hasApple={isFull} />
          <div className="mt-8 w-full max-w-xs text-center">
            <div className="flex justify-between text-xs font-black text-emerald-700 mb-2 uppercase tracking-widest">
              <span>Growth</span>
              <span>{nutrition}%</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border-2 border-emerald-50">
              <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${nutrition}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* フッターナビゲーション */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/50 flex justify-around items-center z-40">
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 cursor-default">
          <span className="text-2xl text-white">🍎</span>
        </div>
        <Link href={`/map/${routeId}`} className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">🗺️</span>
          <span className="text-[10px] font-black text-slate-400">マップ</span>
        </Link>
        <Link href="/collection/user-1" className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="text-2xl">📦</span>
          <span className="text-[10px] font-black text-slate-400">貯蔵庫</span>
        </Link>
      </footer>

      {showModal && <HarvestModal variety={variety} onClose={handleCloseModal} />}
    </div>
  );
}